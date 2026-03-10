import { cssInterop } from "nativewind";
import { PressableOpacity } from "pressto";
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const StyledPressable = cssInterop(PressableOpacity, {
  className: "style",
});

// Define the props interface for better DX
interface WebDatePickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date | null) => void;
  onClose: () => void;
}

export function WebDatePicker({
  selectedDate,
  onSelect,
  onClose,
}: WebDatePickerProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[40px] shadow-2xl items-center border border-black/5 dark:border-white/10">
      <Text className="text-black dark:text-white font-heading font-bold mb-4 text-xl tracking-tight">
        Select Exam Date
      </Text>

      <DatePicker
        selected={selectedDate}
        // This fixes the 'any' error by explicitly typing the parameter
        onChange={(date: Date | null) => onSelect(date)}
        inline
        calendarClassName="brainguin-calendar"
        // Prevent selecting past dates
        minDate={new Date()}
      />

      <StyledPressable
        onPress={onClose}
        className="mt-6 w-full py-4 bg-zinc-100 dark:bg-white/5 rounded-2xl items-center active:opacity-70"
      >
        <Text className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[2px] text-[10px]">
          {t("close")}
        </Text>
      </StyledPressable>

      {/* Custom CSS to inject into the head to override the library's blue theme */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .brainguin-calendar {
          border: none !important;
          font-family: inherit !important;
          background-color: transparent !important;
          color: inherit !important;
        }
        .react-datepicker__header { 
          background-color: transparent !important; 
          border: none !important; 
        }
        .react-datepicker__day-name, .react-datepicker__day {
          color: #94A3B8 !important;
          width: 2.5rem !important;
          line-height: 2.5rem !important;
        }
        .react-datepicker__day--selected { 
          background-color: #F97316 !important; 
          color: white !important;
          border-radius: 12px !important; 
        }
        .react-datepicker__day:hover { 
          border-radius: 12px !important; 
          background-color: rgba(249, 115, 22, 0.1) !important;
        }
        .react-datepicker__current-month {
          color: #F97316 !important;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.9rem !important;
        }
        /* Dark mode text support */
        @media (prefers-color-scheme: dark) {
          .react-datepicker__day { color: #E2E8F0 !important; }
        }
      `,
        }}
      />
    </View>
  );
}
