import ConfirmModal from "@/components/ConfirmModal";
import ThinkingState from "@/components/Creation/ThinkingState";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useFocusEffect, useRouter } from "expo-router";
import { cssInterop, useColorScheme } from "nativewind";
import { PressableOpacity, PressableScale } from "pressto";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const StyledPressable = cssInterop(PressableScale, {
  className: "style",
});

// --- HELPERS ---
const getNumColumns = (width: number) =>
  width > 1000 ? 4 : width > 700 ? 3 : 2;

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
};

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [isThinking, setIsThinking] = useState(false);
  const { session } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deckToDelete, setDeckToDelete] = useState<any>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // --- EXAM DATE LOGIC ---
  const [examDatePickerVisible, setExamDatePickerVisible] = useState(false);
  const [deckForExamDate, setDeckForExamDate] = useState<any>(null);
  const [tempExamDate, setTempExamDate] = useState(new Date());

  const handleEditExamDate = (deck: any) => {
    setDeckForExamDate(deck);
    if (deck.exam_date) {
      // Ask if they want to Change or Remove the date
      Alert.alert(
        t("library.exam_alert.title", "Exam Date"),
        t("library.exam_alert.desc", "What would you like to do?"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("library.exam_alert.remove", "Remove Exam Date"),
            style: "destructive",
            onPress: () => saveLibraryExamDate(deck.id, null),
          },
          {
            text: t("library.exam_alert.change", "Change Date"),
            onPress: () => {
              setTempExamDate(new Date(deck.exam_date));
              setExamDatePickerVisible(true);
            },
          },
        ],
      );
    } else {
      // No date currently, just open the picker
      setTempExamDate(new Date());
      setExamDatePickerVisible(true);
    }
  };

  const saveLibraryExamDate = async (deckId: string, date: Date | null) => {
    try {
      const targetDateStr = date ? date.toISOString().split("T")[0] : null;

      // 1. Update Database Deck
      await supabase
        .from("decks")
        .update({ exam_date: targetDateStr })
        .eq("id", deckId);

      // 2. Pull cards forward if a new date is set!
      if (targetDateStr) {
        await supabase
          .from("flashcards")
          .update({ next_review_at: new Date().toISOString() })
          .eq("deck_id", deckId)
          .gt("next_review_at", targetDateStr);
      }

      // 3. Update Local State UI
      setDecks((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, exam_date: targetDateStr } : d,
        ),
      );
      Toast.show({
        type: "success",
        text1: t("library.toast_exam_updated", "Study plan updated!"),
      });
    } catch (e) {
      console.error(e);
      Toast.show({ type: "error", text1: "Failed to update date." });
    }
  };

  // --- FILTERING STATES ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 1. Sort Order
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "reviewed">(
    "newest",
  );
  // 2. Source Type (Document, URL...)
  const [filterType, setFilterType] = useState<
    "all" | "document" | "url" | "topic"
  >("all");
  // 3. Deck Status (Active vs Archived) - Default to 'active' to hide clutter
  const [filterStatus, setFilterStatus] = useState<
    "active" | "archived" | "all"
  >("active");

  const insets = useSafeAreaInsets();
  const isDesktop = width > 1000;
  const isSmallScreen = width < 600;
  const numColumns = isSmallScreen ? 1 : getNumColumns(width);

  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  // --- 1. FETCH DECKS ---
  const fetchDecks = useCallback(async () => {
    try {
      if (!session?.user) return;
      if (!refreshing) setLoading(true);

      const { data, error } = await supabase
        .from("deck_stats")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedDecks = data.map((d) => ({
        ...d,
        totalCards: d.total_cards,
        masteredCards: d.mastered_cards,
        isArchived: d.is_archived,
        exam_date: d.exam_date,
      }));

      setDecks(formattedDecks || []);
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "error",
        text1: t("errors.fetch_failed"),
        text2: e.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, refreshing]);

  // --- 2. LOGIC: FILTERING & SORTING ---
  const processedDecks = useMemo(() => {
    let result = decks.filter((d) =>
      d.title?.toLowerCase().includes(search.toLowerCase()),
    );

    // Filter by Source Type
    if (filterType !== "all") {
      result = result.filter((d) => d.source_type === filterType);
    }

    // Filter by Status (Active/Archived)
    if (filterStatus === "active") {
      result = result.filter((d) => !d.isArchived);
    } else if (filterStatus === "archived") {
      result = result.filter((d) => d.isArchived);
    }
    // if 'all', show everything

    // Sort
    if (sortBy === "newest")
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    if (sortBy === "oldest")
      result.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    if (sortBy === "reviewed")
      result.sort(
        (a, b) =>
          new Date(b.last_reviewed_at || 0).getTime() -
          new Date(a.last_reviewed_at || 0).getTime(),
      );

    return result;
  }, [decks, search, sortBy, filterType, filterStatus]);

  // --- 3. DELETE LOGIC ---
  const handleDeletePress = (item: any) => {
    setDeckToDelete(item);
    setIsDeleteModalVisible(true);
  };

  const performDelete = async () => {
    if (!deckToDelete) return;
    try {
      const { error } = await supabase
        .from("decks")
        .delete()
        .eq("id", deckToDelete.id);
      if (error) throw error;
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete.id));
      Toast.show({
        type: "success",
        text1: t("library.toast.delete_title"),
        text2: t("library.toast.delete_desc", { title: deckToDelete.title }),
      });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("errors.delete_failed"),
        text2: e.message,
      });
    } finally {
      setIsDeleteModalVisible(false);
      setDeckToDelete(null);
    }
  };

  // --- 4. ARCHIVE LOGIC ---
  const handleArchiveToggle = async (item: any) => {
    try {
      const newStatus = !item.isArchived;

      // Optimistic Update
      setDecks((prev) =>
        prev.map((d) =>
          d.id === item.id ? { ...d, isArchived: newStatus } : d,
        ),
      );

      const { error } = await supabase
        .from("decks")
        .update({ is_archived: newStatus })
        .eq("id", item.id);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: newStatus
          ? t("library.toast_archived_title")
          : t("library.toast_restored_title"),
        text2: newStatus
          ? t("library.toast_archived_desc")
          : t("library.toast_restored_desc"),
        visibilityTime: 2000,
      });
    } catch (e: any) {
      console.error(e);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === item.id ? { ...d, isArchived: !item.isArchived } : d,
        ),
      );
      Toast.show({ type: "error", text1: t("library.toast_action_failed") });
    }
  };

  // --- 5. GENERATE MORE LOGIC ---
  const handleGenerateMore = async (item: any) => {
    if (!session?.user) return;
    try {
      const { data: limitData, error: limitError } = await supabase.rpc(
        "check_user_limit",
        { user_uuid: session.user.id },
      );
      if (limitError) throw limitError;
      if (limitData.limit_reached) {
        router.push("/paywall");
        return;
      }
      setIsThinking(true);
      const { data, error } = await supabase.functions.invoke(
        "generate-cards",
        {
          body: {
            deckId: item.id,
            // inputType: item.source_type,
            // Even if the source_type is "document", the data we are sending
            // (source_content) is already extracted text. So we treat it as a "topic".
            inputType: "topic",
            data: item.source_content,
            userId: session.user.id,
          },
        },
      );
      if (error) throw error;
      await supabase.rpc("increment_generation_count", {
        user_uuid: session.user.id,
      });
      Toast.show({ type: "success", text1: t("library.toast.success_added") });
      fetchDecks();
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "error",
        text1: t("errors.expansion_failed"),
        text2: e.message,
      });
    } finally {
      setIsThinking(false);
    }
  };

  // 🔄 This ensures that every time you come back from the Study page,
  // the deck stats (including the new exam date) are refreshed.
  useFocusEffect(
    useCallback(() => {
      fetchDecks();
    }, [fetchDecks]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  // Determine if any filters are active for coloring the button
  const isFiltersActive =
    filterType !== "all" || sortBy !== "newest" || filterStatus !== "active";

  return (
    <View className="flex-1 bg-page-light dark:bg-page-dark">
      <Pressable
        className="flex-1"
        onPress={
          Platform.OS === "ios" || Platform.OS === "android"
            ? Keyboard.dismiss
            : undefined
        }
        accessible={false}
      >
        <View
          className="flex-1"
          style={{
            paddingLeft: isDesktop ? 300 : 20,
            paddingRight: 20,
            paddingTop: insets.top + 20,
          }}
        >
          {/* HEADER AREA */}
          <View className="flex-row justify-between items-center mb-2">
            {/* <View className="gap-[2px]">
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs font-bold uppercase tracking-[2px]">
                {t("library.header_small")}
              </Text> */}
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
              {t("library.header_title")}
            </Text>
            {/* </View> */}

            <PressableFinal
              onPress={() => router.push("/creation-modal")}
              activateOnHover
              style={{
                backgroundColor: Colors.brand.action,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: Colors.brand.action,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Ionicons name="add" size={28} color="white" />
            </PressableFinal>
          </View>

          {/* SEARCH & FILTER ROW */}
          <View className="flex-row gap-3 mb-6 mt-4">
            <View className="flex-1 bg-card-light dark:bg-card-dark h-14 rounded-2xl flex-row items-center px-4 border border-black/5 dark:border-white/5 shadow-sm">
              <Ionicons name="search" size={20} color="#94A3B8" />
              <TextInput
                className="flex-1 ml-3 font-body text-text-main-light dark:text-text-main-dark h-full"
                placeholder={t("library.search_placeholder")}
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <PressableFinal
              onPress={() => setIsFilterOpen(true)}
              activateOnHover
              style={{
                width: Platform.OS === "web" ? 54 : 48,
                height: Platform.OS === "web" ? 54 : 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                backgroundColor: isFiltersActive
                  ? Colors.brand.action
                  : isDark
                    ? Colors.dark.card
                    : Colors.light.card,
                borderColor: isFiltersActive
                  ? Colors.brand.action
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
              }}
            >
              <Ionicons
                name="options"
                size={24}
                color={isFiltersActive ? "white" : "#94A3B8"}
              />
            </PressableFinal>
          </View>

          {/* LIST */}
          {loading && !refreshing ? (
            <View className="flex-1 justify-center">
              <ActivityIndicator color="#F97316" size="large" />
            </View>
          ) : (
            <FlatList
              data={processedDecks}
              key={numColumns}
              numColumns={numColumns}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={numColumns > 1 ? { gap: 16 } : null}
              contentContainerStyle={{ paddingBottom: isDesktop ? 40 : 140 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#F97316"
                />
              }
              renderItem={({ item }) => (
                <DeckCard
                  item={item}
                  onPress={() => router.push(`/study/${item.id}`)}
                  onDelete={() => handleDeletePress(item)}
                  onGenerate={() => handleGenerateMore(item)}
                  onArchive={() => handleArchiveToggle(item)}
                  onEditExamDate={() => handleEditExamDate(item)}
                />
              )}
              ListEmptyComponent={
                <View className="items-center justify-center mt-20 opacity-30">
                  <Ionicons
                    name="file-tray-outline"
                    size={80}
                    color="#94A3B8"
                  />
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl mt-4">
                    {filterStatus === "archived"
                      ? "No archived decks"
                      : t("library.empty_title")}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* MODALS */}
        <FilterModal
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterType={filterType}
          setFilterType={setFilterType}
          filterStatus={filterStatus} // Pass new prop
          setFilterStatus={setFilterStatus} // Pass new prop
        />
        <ConfirmModal
          visible={isDeleteModalVisible}
          title={t("common.delete_deck_title")}
          message={t("common.delete_deck_message", {
            title: deckToDelete?.title,
          })}
          confirmLabel={t("common.delete_deck_confirm")}
          isDestructive={true}
          onConfirm={performDelete}
          onCancel={() => setIsDeleteModalVisible(false)}
        />
      </Pressable>

      <Modal
        visible={isThinking}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <ThinkingState />
      </Modal>

      <DatePicker
        modal
        open={examDatePickerVisible}
        date={tempExamDate}
        mode="date"
        minimumDate={new Date(new Date().setDate(new Date().getDate() + 2))}
        onConfirm={(date) => {
          setExamDatePickerVisible(false);
          saveLibraryExamDate(deckForExamDate.id, date);
        }}
        onCancel={() => {
          setExamDatePickerVisible(false);
        }}
      />
    </View>
  );
}

function DeckCard({
  item,
  onPress,
  onDelete,
  onGenerate,
  onArchive,
  onEditExamDate,
}: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation();

  const count = item.totalCards || 0;
  const mastered = item.masteredCards || 0;
  const isArchived = item.isArchived || false;

  const progress = count > 0 ? mastered / count : 0;
  const isCompleted = progress >= 0.9;

  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  // Helper for Source Badge Label & Color
  const getSourceBadge = (type: string) => {
    switch (type) {
      case "document":
        return {
          label: t("library.source_badges.document"),
          color:
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        };
      case "url":
        return {
          label: t("library.source_badges.url"),
          color:
            "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        };
      case "topic":
        return {
          label: t("library.source_badges.topic"),
          color:
            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        };
      default:
        return {
          label: t("library.source_badges.unknown"),
          color: "bg-gray-100 text-gray-700",
        };
    }
  };

  const badge = getSourceBadge(item.source_type);

  return (
    <PressableFinal
      onPress={onPress}
      activateOnHover
      style={{
        flex: 1,
        padding: 20,
        borderRadius: 32,
        marginBottom: 16,
        borderWidth: 1,
        position: "relative",
        overflow: "hidden",
        justifyContent: "space-between",
        minHeight: 280,
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
        opacity: isArchived ? 0.6 : 1,
      }}
    >
      {!isArchived && (
        <View className="absolute right-[-30] top-[-30] w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
      )}

      {/* --- TOP ROW: Source Badge & Right Actions --- */}
      <View className="flex-row justify-between items-start mb-4">
        {/* Source Badge */}
        <View
          className={`px-3 py-1.5 rounded-full ${badge.color.split(" ")[0]}`}
        >
          <Text
            className={`text-[10px] font-bold uppercase tracking-wider ${badge.color.split(" ")[1]}`}
          >
            {badge.label}
          </Text>
        </View>

        {/* Right Actions: Exam Date & Delete */}
        <View className="flex-row items-center gap-2">
          {item.exam_date ? (
            <StyledPressable
              onPress={onEditExamDate}
              className="bg-action/10 px-3 py-1.5 rounded-full flex-row items-center gap-1 border border-action/20"
            >
              <Ionicons name="calendar" size={12} color={Colors.brand.action} />
              <Text className="text-action text-[10px] font-bold uppercase tracking-widest">
                {formatDate(item.exam_date)}
              </Text>
            </StyledPressable>
          ) : (
            <StyledPressable
              onPress={onEditExamDate}
              className="bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full flex-row items-center gap-1"
            >
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-bold uppercase tracking-widest">
                {t("library.card.add_exam", "Add Exam")}
              </Text>
            </StyledPressable>
          )}

          <PressableFinal
            activateOnHover
            onPress={onDelete}
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.6,
            }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={isDark ? "#FFF" : "#000"}
            />
          </PressableFinal>
        </View>
      </View>

      <View className="mb-6">
        <Text
          numberOfLines={2}
          className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-2xl leading-tight"
        >
          {item.title}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs uppercase font-bold mt-2 tracking-wider">
          {mastered} / {count} {t("library.card.mastered_count")}
        </Text>
      </View>

      <View className="gap-3">
        <View
          className={clsx(
            "py-3.5 rounded-2xl items-center border",
            isCompleted
              ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
              : "bg-action/10 border-action/5",
          )}
        >
          <Text
            className={clsx(
              "font-heading font-bold text-xs uppercase tracking-[2px]",
              isCompleted
                ? "text-green-600 dark:text-green-400"
                : "text-action",
            )}
          >
            {isCompleted
              ? t("library.card.status_completed")
              : t("library.card.start_review")}
          </Text>
        </View>

        {!isCompleted && !isArchived && (
          <PressableFinal
            onPress={onGenerate}
            activateOnHover
            style={{
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="sparkles" size={14} color={Colors.brand.action} />
            <Text className="text-action font-bold text-xs uppercase tracking-wide">
              {t("library.card.generate_more")}
            </Text>
          </PressableFinal>
        )}

        <PressableFinal
          onPress={onArchive}
          activateOnHover
          style={{ alignItems: "center", paddingTop: 4 }}
        >
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-bold uppercase opacity-60">
            {isArchived ? (
              <Text>
                <Ionicons name="refresh" size={10} />{" "}
                {t("library.restore_deck_btn")}
              </Text>
            ) : (
              <Text>
                <Ionicons name="file-tray-full" size={10} />{" "}
                {t("library.archive_deck_btn")}
              </Text>
            )}
          </Text>
        </PressableFinal>
      </View>
    </PressableFinal>
  );
}

// --- UPDATED FILTER MODAL ---
function FilterModal({
  visible,
  onClose,
  sortBy,
  setSortBy,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
}: any) {
  const { t } = useTranslation();
  const [tempSort, setTempSort] = useState(sortBy);
  const [tempType, setTempType] = useState(filterType);
  const [tempStatus, setTempStatus] = useState(filterStatus); // New Local State

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  React.useEffect(() => {
    if (visible) {
      setTempSort(sortBy);
      setTempType(filterType);
      setTempStatus(filterStatus);
    }
  }, [visible, sortBy, filterType, filterStatus]);

  const handleApply = () => {
    setSortBy(tempSort);
    setFilterType(tempType);
    setFilterStatus(tempStatus);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      presentationStyle="overFullScreen"
      animationType="fade"
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-page-light dark:bg-page-dark w-full max-w-md rounded-[40px] p-8 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-2xl font-bold">
              {t("library.filter_title")}
            </Text>
            <PressableFinal
              onPress={onClose}
              style={{
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
                padding: 8,
                borderRadius: 99,
              }}
              activateOnHover
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#FFF" : "#64748B"}
              />
            </PressableFinal>
          </View>

          {/* 1. DECK STATUS (NEW) */}
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-4">
            Status
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {[
              { id: "active", label: t("library.status_active") },
              { id: "archived", label: t("library.status_archived") },
              { id: "all", label: t("library.status_all") },
            ].map((opt) => (
              <PressableFinal
                key={opt.id}
                activateOnHover
                onPress={() => setTempStatus(opt.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor:
                    tempStatus === opt.id ? Colors.brand.action : "transparent",
                  borderColor:
                    tempStatus === opt.id
                      ? Colors.brand.action
                      : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                }}
              >
                <Text
                  className={clsx(
                    "font-body font-bold uppercase",
                    tempStatus === opt.id
                      ? "text-white"
                      : "text-text-muted-light dark:text-text-muted-dark",
                  )}
                >
                  {opt.label}
                </Text>
              </PressableFinal>
            ))}
          </View>

          {/* 2. SORT BY */}
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-4">
            {t("library.sort_by")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {["newest", "oldest", "reviewed"].map((opt: any) => (
              <PressableFinal
                key={opt}
                activateOnHover
                onPress={() => setTempSort(opt)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor:
                    tempSort === opt ? Colors.brand.action : "transparent",
                  borderColor:
                    tempSort === opt
                      ? Colors.brand.action
                      : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                }}
              >
                <Text
                  className={clsx(
                    "font-body font-bold uppercase",
                    tempSort === opt
                      ? "text-white"
                      : "text-text-muted-light dark:text-text-muted-dark",
                  )}
                >
                  {t(`library.sort_options.${opt}`)}
                </Text>
              </PressableFinal>
            ))}
          </View>

          {/* 3. SOURCE TYPE */}
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-4">
            {t("library.source_type")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-10">
            {["all", "document", "url", "topic"].map((type: any) => (
              <PressableFinal
                key={type}
                activateOnHover
                onPress={() => setTempType(type)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor:
                    tempType === type ? Colors.brand.action : "transparent",
                  borderColor:
                    tempType === type
                      ? Colors.brand.action
                      : isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                }}
              >
                <Text
                  className={clsx(
                    "font-body font-bold uppercase",
                    tempType === type
                      ? "text-white"
                      : "text-text-muted-light dark:text-text-muted-dark",
                  )}
                >
                  {t(`library.source_types.${type}`)}
                </Text>
              </PressableFinal>
            ))}
          </View>

          {/* APPLY */}
          <PressableFinal
            onPress={handleApply}
            activateOnHover
            style={{
              backgroundColor: isDark ? Colors.dark.text : Colors.light.text,
              paddingVertical: 20,
              borderRadius: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white dark:text-black font-heading font-bold text-lg">
              {t("library.apply_filters")}
            </Text>
          </PressableFinal>
        </View>
      </View>
    </Modal>
  );
}
