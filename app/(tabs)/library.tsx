import ConfirmModal from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import useStoreLoader from "@/store/storeLoader";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableScale } from "pressto";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// --- HELPERS ---
const getNumColumns = (width: number) =>
  width > 1000 ? 4 : width > 700 ? 3 : 2;

const formatDate = (dateString: string) => {
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
  const { setIsThinking } = useStoreLoader();
  const { session } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deckToDelete, setDeckToDelete] = useState<any>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // Filtering States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "reviewed">(
    "newest",
  );
  const [filterType, setFilterType] = useState<"all" | "pdf" | "url" | "topic">(
    "all",
  );

  const insets = useSafeAreaInsets();
  const isDesktop = width > 1000;
  const isSmallScreen = width < 600;
  const numColumns = isSmallScreen ? 1 : getNumColumns(width);

  // --- 1. FETCH DECKS (DUMMY DATA UPDATED) ---
  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setDecks([
        {
          id: "10",
          title: "The History of Samurai ⚔️",
          source_type: "topic",
          created_at: "2024-01-10T10:00:00Z",
          last_reviewed_at: "2024-01-12T15:30:00Z",
          flashcards: [{ count: 15 }],
        },
        {
          id: "11",
          title: "React Native Performance",
          source_type: "url",
          created_at: "2024-01-08T09:00:00Z",
          last_reviewed_at: null,
          flashcards: [{ count: 22 }],
        },
        {
          id: "12",
          title: "Biology 101: Mitosis",
          source_type: "pdf",
          created_at: "2023-12-25T08:00:00Z",
          last_reviewed_at: "2024-01-13T11:00:00Z",
          flashcards: [{ count: 45 }],
        },
      ]);
      setLoading(false);
      setRefreshing(false);
    }, 800);
  }, []);

  React.useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  // --- 2. LOGIC: FILTERING & SORTING ---
  const processedDecks = useMemo(() => {
    let result = decks.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase()),
    );

    if (filterType !== "all") {
      result = result.filter((d) => d.source_type === filterType);
    }

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
  }, [decks, search, sortBy, filterType]);

  // --- 3. ACTIONS ---
  const handleGenerateMore = (item: any) => {
    Toast.show({
      type: "info",
      text1: t("library.toast.generating_title"),
      text2: t("library.toast.generating_desc", { title: item.title }),
    });
    // logic would go here to call the edge function again
  };

  // Inside LibraryScreen.tsx

  // 1. REAL FETCH LOGIC
  const realfetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("decks")
        .select("*, flashcards(count)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDecks(data || []);
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
  }, [session]);

  // 2. REAL DELETE LOGIC
  const handleDeletePress = (item: any) => {
    setDeckToDelete(item);
    setIsDeleteModalVisible(true);
  };

  // This does the ACTUAL work
  const performDelete = async () => {
    if (!deckToDelete) return;

    try {
      // 1. REAL SUPABASE DELETE (Uncomment when ready)
      // const { error } = await supabase.from("decks").delete().eq("id", deckToDelete.id);
      // if (error) throw error;

      // 2. UI UPDATE
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

  // 3. REAL "GENERATE MORE" LOGIC
  const realhandleGenerateMore = async (item: any) => {
    setIsThinking(true); // Global Penguin ON
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-cards",
        {
          body: {
            deckId: item.id, // Tells function to append
            inputType: item.source_type,
            data: item.source_content,
            userId: session?.user?.id,
          },
        },
      );

      if (error) throw error;

      Toast.show({ type: "success", text1: t("library.toast.success_added") });
      fetchDecks(); // Refresh list to see new count
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("errors.expansion_failed"),
        text2: e.message,
      });
    } finally {
      setIsThinking(false);
    }
  };

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
            paddingTop: Platform.OS === "ios" ? insets.top : 20,
            // paddingBottom: isDesktop ? 20 : 100,
          }}
        >
          {/* HEADER AREA */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="gap-[2px]">
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs font-bold uppercase tracking-[2px]">
                {t("library.header_small")}
              </Text>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
                {t("library.header_title")}
              </Text>
            </View>
            {/* <Pressable
              onPress={() => router.push("/(tabs)")}
              className={clsx(
                "bg-action w-12 h-12 rounded-full items-center justify-center shadow-lg active:scale-90 transition-all duration-200",
                // Light Mode Hover: Use a solid darker orange
                "hover:bg-orange-600",
                // Dark Mode Hover: Use a solid slightly lighter/vibrant orange to pop
                "dark:hover:bg-orange-400"
              )}
            > */}
            <PressableScale
              onPress={() => router.push("/(tabs)")}
              activateOnHover
              style={{
                backgroundColor: Colors.brand.action,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                // Shadow logic
                shadowColor: Colors.brand.action,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Ionicons name="add" size={28} color="white" />
              <Ionicons name="add" size={28} color="white" />
            </PressableScale>
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
            {/* <Pressable
              onPress={() => setIsFilterOpen(true)}
              className={clsx(
                "w-14 h-14 rounded-2xl items-center justify-center border shadow-sm transition-all duration-200 active:scale-95",
                // 1. Logic for ACTIVE state (Orange)
                filterType !== "all" || sortBy !== "newest"
                  ? "bg-action border-action hover:bg-orange-600"
                  : // 2. Logic for INACTIVE state (Neutral)
                    "bg-card-light dark:bg-card-dark border-black/5 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              <Ionicons
                name="options"
                size={24}
                color={
                  filterType !== "all" || sortBy !== "newest"
                    ? "white"
                    : "#94A3B8"
                }
              />
            </Pressable> */}
            <PressableScale
              onPress={() => setIsFilterOpen(true)}
              activateOnHover
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                backgroundColor:
                  filterType !== "all" || sortBy !== "newest"
                    ? Colors.brand.action
                    : isDark
                      ? Colors.dark.card
                      : Colors.light.card,
                borderColor:
                  filterType !== "all" || sortBy !== "newest"
                    ? Colors.brand.action
                    : isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
              }}
            >
              <Ionicons
                name="options"
                size={24}
                color={
                  filterType !== "all" || sortBy !== "newest"
                    ? "white"
                    : "#94A3B8"
                }
              />
            </PressableScale>
          </View>

          {/* LIST */}
          {loading ? (
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
              contentContainerStyle={{
                paddingBottom: isDesktop ? 40 : 140, // 140px ensures the last card clears the mobile Tab Bar
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchDecks()}
                  tintColor="#F97316"
                />
              }
              renderItem={({ item }) => (
                <DeckCard
                  item={item}
                  onPress={() => router.push(`/study/${item.id}`)}
                  onDelete={() => handleDeletePress(item)}
                  onGenerate={() => handleGenerateMore(item)}
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
                    {t("library.empty_title")}
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
    </View>
  );
}

function DeckCard({ item, onPress, onDelete, onGenerate }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation();
  const count = item.flashcards?.[0]?.count || 0;

  return (
    // <Pressable
    //   onPress={onPress}
    //   className={clsx(
    //     "flex-1 p-5 rounded-[32px] mb-4 border relative overflow-hidden h-64 justify-between transition-all duration-250 active:scale-[0.98] shadow-xl shadow-black/5",
    //     "bg-card-light dark:bg-card-dark border-black/5 dark:border-white/5",
    //     "hover:bg-slate-50 hover:border-black/[0.08]",
    //     "dark:hover:bg-slate-800/60 dark:hover:border-white/10",
    //   )}
    // >
    <PressableScale
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
        height: 256,
        justifyContent: "space-between",
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
      }}
    >
      {/* Decorative Background Blur */}
      <View className="absolute right-[-30] top-[-30] w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

      <View>
        <View className="flex-row justify-between items-start">
          {/* Source Type Icon */}
          <View className="bg-black/5 dark:bg-white/10 w-12 h-12 rounded-2xl items-center justify-center">
            <Ionicons
              name={
                item.source_type === "pdf"
                  ? "document-text"
                  : item.source_type === "url"
                    ? "link"
                    : "bulb"
              }
              size={24}
              color={
                item.source_type === "pdf"
                  ? "#38BDF8"
                  : item.source_type === "url"
                    ? "#F97316"
                    : "#22C55E"
              }
            />
          </View>

          {/* Action Buttons (Mobile Friendly Size) */}
          <View className="flex-row gap-2">
            {/* <Pressable
              onPress={onGenerate}
              className="w-12 h-12 rounded-full bg-accent/10 items-center justify-center active:bg-accent/20"
            >
              <Ionicons name="sparkles" size={18} color="#F97316" />
            </Pressable>
            <Pressable
              onPress={onDelete}
              className="w-12 h-12 rounded-full bg-red-500/10 items-center justify-center active:bg-red-500/20"
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
            </Pressable> */}
            {/* Sparkles Button */}
            <PressableScale
              activateOnHover
              onPress={onGenerate}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${Colors.brand.accent}1A`, // 10% accent
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="sparkles" size={18} color={Colors.brand.action} />
            </PressableScale>

            {/* Trash Button */}
            <PressableScale
              activateOnHover
              onPress={onDelete}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#EF44441A", // 10% red
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
            </PressableScale>
          </View>
        </View>

        <Text
          numberOfLines={2}
          className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl mt-4 leading-tight"
        >
          {item.title}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs uppercase font-bold mt-1 tracking-wider">
          {count} Flashcards
        </Text>
      </View>

      <View className="border-t border-black/5 dark:border-white/5 pt-4">
        {/* Date Info Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[11px] font-medium">
            {t("library.card.created")}: {formatDate(item.created_at)}
          </Text>
          <View className="flex-row items-center">
            <View
              className={clsx(
                "w-2 h-2 rounded-full mr-1.5",
                item.last_reviewed_at ? "bg-green-400" : "bg-slate-300",
              )}
            />
            <Text className="text-text-muted-light dark:text-text-muted-dark text-[11px] font-medium">
              {item.last_reviewed_at
                ? `${t("library.card.reviewed")}: ${formatDate(
                    item.last_reviewed_at,
                  )}`
                : t("library.card.never_reviewed")}
            </Text>
          </View>
        </View>

        {/* Start Review Button (Tall & Prominent) */}
        <View className="bg-action/10 py-3.5 rounded-2xl items-center border border-action/5">
          <Text className="text-action font-heading font-bold text-xs uppercase tracking-[2px]">
            {t("library.card.start_review")}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

// --- HELPER COMPONENT TO PREVENT CRASH ---
const FilterButton = ({ label, isActive, onPress, isDark }: any) => {
  const [isHovered, setIsHovered] = useState(false);

  // EXACT HEX CODES to match your NativeWind theme
  const colors = {
    active: {
      base: "#F97316", // bg-action
      hover: isDark ? "#FB923C" : "#EA580C", // orange-400 (dark) / orange-600 (light)
    },
    inactive: {
      base: "transparent",
      hover: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", // subtle grey
      border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    },
    text: {
      active: "#FFFFFF",
      inactive: isDark ? "#94A3B8" : "#64748B", // text-muted
    },
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      // 1. Layout via Tailwind (Safe)
      className="px-5 py-3 rounded-2xl border transition-all duration-200"
      // 2. Color logic via Style (Prevents Crash)
      style={({ pressed }) => {
        const isInteracting = isHovered || pressed;
        return {
          backgroundColor: isActive
            ? isInteracting
              ? colors.active.hover
              : colors.active.base
            : isInteracting
              ? colors.inactive.hover
              : colors.inactive.base,
          borderColor: isActive
            ? isInteracting
              ? colors.active.hover
              : colors.active.base
            : colors.inactive.border,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        };
      }}
    >
      <Text
        style={{
          fontFamily: "Nunito-Bold", // Ensure this matches your app font
          fontWeight: "bold",
          textTransform: label.length < 4 ? "uppercase" : "capitalize",
          color: isActive ? colors.text.active : colors.text.inactive,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// --- UPDATED SUB-COMPONENT: FILTER MODAL ---
function FilterModal({
  visible,
  onClose,
  sortBy,
  setSortBy,
  filterType,
  setFilterType,
}: any) {
  const { t } = useTranslation();
  const [tempSort, setTempSort] = useState(sortBy);
  const [tempType, setTempType] = useState(filterType);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  React.useEffect(() => {
    if (visible) {
      setTempSort(sortBy);
      setTempType(filterType);
    }
  }, [visible, sortBy, filterType]);

  const handleApply = () => {
    setSortBy(tempSort);
    setFilterType(tempType);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-page-light dark:bg-page-dark w-full max-w-md rounded-[40px] p-8 shadow-2xl">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-2xl font-bold">
              {t("library.filter_title")}
            </Text>
            <Pressable
              onPress={onClose}
              // SUBTLE: White/Black shift depending on theme
              className="bg-black/5 dark:bg-white/10 p-2 rounded-full transition-all hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 duration-250"
            >
              <Ionicons name="close" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          {/* SORT BY SECTION */}
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-4">
            {t("library.sort_by")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-8">
            {["newest", "oldest", "reviewed"].map((opt: any) => (
              // Platform.OS === "web" ? (
              //   <Pressable
              //     key={opt}
              //     onPress={() => setTempSort(opt)}
              //     className={clsx(
              //       "px-5 py-3 rounded-2xl border transition-all duration-200",
              //       // ORANGE HOVER: We use a slightly darker orange (orange-600)
              //       tempSort === opt
              //         ? "bg-action border-action hover:bg-orange-600"
              //         : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5",
              //     )}
              //   >
              //     <Text
              //       className={clsx(
              //         "font-body font-bold capitalize",
              //         tempSort === opt
              //           ? "text-white"
              //           : "text-text-muted-light dark:text-text-muted-dark",
              //       )}
              //     >
              //       {t(`library.sort_options.${opt}`)}
              //     </Text>
              //   </Pressable>
              // ) : (
              //   <Pressable
              //     key={opt}
              //     onPress={() => setTempSort(opt)}
              //     // PURE STYLE IMPLEMENTATION
              //     style={{
              //       // Layout (Matches px-5 py-3 rounded-2xl border)
              //       paddingHorizontal: 20,
              //       paddingVertical: 12,
              //       borderRadius: 16,
              //       borderWidth: 1,

              //       // Colors (Orange vs Transparent)
              //       backgroundColor:
              //         tempSort === opt ? "#F97316" : "transparent",

              //       // Border (Orange vs Subtle Gray)
              //       borderColor:
              //         tempSort === opt
              //           ? "#F97316"
              //           : colorScheme === "dark"
              //             ? "rgba(255,255,255,0.1)"
              //             : "rgba(0,0,0,0.1)",
              //     }}
              //   >
              //     <Text
              //       className={clsx(
              //         "font-body font-bold uppercase",
              //         tempSort === opt
              //           ? "text-white"
              //           : "text-text-muted-light dark:text-text-muted-dark",
              //       )}
              //     >
              //       {t(`library.sort_options.${opt}`)}
              //     </Text>
              //   </Pressable>
              // ),
              <PressableScale
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
              </PressableScale>
            ))}
          </View>

          {/* SOURCE TYPE SECTION */}
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-4">
            {t("library.source_type")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-10">
            {["all", "pdf", "url", "topic"].map((type: any) => (
              // Platform.OS === "web" ? (
              //   <Pressable
              //     key={type}
              //     onPress={() => setTempType(type)}
              //     className={clsx(
              //       "px-5 py-3 rounded-2xl border transition-all duration-200",
              //       // ORANGE HOVER: We use a slightly darker orange (orange-600)
              //       tempType === type
              //         ? "bg-action border-action hover:bg-orange-600"
              //         : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5",
              //     )}
              //   >
              //     <Text
              //       className={clsx(
              //         "font-body font-bold capitalize",
              //         tempType === type
              //           ? "text-white"
              //           : "text-text-muted-light dark:text-text-muted-dark",
              //       )}
              //     >
              //       {t(`library.source_types.${type}`)}
              //     </Text>
              //   </Pressable>
              // ) : (
              //   <Pressable
              //     key={type}
              //     onPress={() => setTempType(type)}
              //     // PURE STYLE IMPLEMENTATION
              //     style={{
              //       // Layout (Matches px-5 py-3 rounded-2xl border)
              //       paddingHorizontal: 20,
              //       paddingVertical: 12,
              //       borderRadius: 16,
              //       borderWidth: 1,

              //       // Colors (Orange vs Transparent)
              //       backgroundColor:
              //         tempType === type ? "#F97316" : "transparent",

              //       // Border (Orange vs Subtle Gray)
              //       borderColor:
              //         tempType === type
              //           ? "#F97316"
              //           : colorScheme === "dark"
              //             ? "rgba(255,255,255,0.1)"
              //             : "rgba(0,0,0,0.1)",
              //     }}
              //   >
              //     <Text
              //       className={clsx(
              //         "font-body font-bold uppercase",
              //         tempType === type
              //           ? "text-white"
              //           : "text-text-muted-light dark:text-text-muted-dark",
              //       )}
              //     >
              //       {t(`library.source_types.${type}`)}
              //     </Text>
              //   </Pressable>
              // ),
              <PressableScale
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
              </PressableScale>
            ))}
          </View>

          {/* APPLY BUTTON */}
          {/* <Pressable
            onPress={handleApply}
            // DARK HOVER: Shifting Slate color for the main button
            className="bg-text-main-light dark:bg-text-main-dark py-5 rounded-3xl items-center shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all duration-250"
          >
            <Text className="text-white dark:text-black font-heading font-bold text-lg">
              {t("library.apply_filters")}
            </Text>
          </Pressable> */}
          <PressableScale
            onPress={handleApply}
            activateOnHover
            style={{
              backgroundColor: isDark ? Colors.dark.text : Colors.light.text,
              paddingVertical: 20,
              borderRadius: 24,
              alignItems: "center",
              // Shadow
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
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}
