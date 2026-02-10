import React from "react";
import {
  ColorProp,
  FlexWidget,
  ImageWidget,
  OverlapWidget,
  TextWidget,
} from "react-native-android-widget";

interface WidgetProps {
  dueCards?: number;
}

export function AndroidWidget({ dueCards = 0 }: WidgetProps) {
  const bgColor = (dueCards > 0 ? "#0F172A" : "#16a34a") as ColorProp;

  const textColor = "#ffffff" as ColorProp;
  const pillBg = "#ffffff1a" as ColorProp;
  const accentColor = "#38BDF8" as ColorProp;
  const actionColor = "#F97316" as ColorProp;

  return (
    <OverlapWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        borderRadius: 32,
      }}
      clickAction={dueCards > 0 ? "brainguin://study/daily" : "brainguin://"}
    >
      {/* LAYER 1: BACKGROUND & DECOR */}
      <OverlapWidget style={{ height: "match_parent", width: "match_parent" }}>
        <FlexWidget
          style={{
            height: "match_parent",
            width: "match_parent",
            backgroundColor: bgColor,
          }}
        />
        <FlexWidget
          style={{
            height: "match_parent",
            width: "match_parent",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          <FlexWidget
            style={{
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: "#ffffff0d" as ColorProp,
              marginRight: -40,
              marginBottom: -40,
            }}
          />
        </FlexWidget>
      </OverlapWidget>

      {/* LAYER 2: CONTENT */}
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          flexDirection: "row",
          padding: 16,
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* 1. PILL LABEL WRAPPER (Replaces alignSelf) */}
          <FlexWidget
            style={{ width: "match_parent", justifyContent: "flex-start" }}
          >
            <FlexWidget
              style={{
                backgroundColor: pillBg,
                borderRadius: 50,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <TextWidget
                text={dueCards > 0 ? "DAILY MISSION" : "MISSION COMPLETE"}
                style={{
                  fontSize: 10,
                  color: accentColor,
                  fontWeight: "bold",
                }}
              />
            </FlexWidget>
          </FlexWidget>

          {/* 2. MAIN TEXT */}
          <FlexWidget style={{ width: "match_parent" }}>
            {dueCards > 0 ? (
              <FlexWidget
                style={{ flexDirection: "row", alignItems: "flex-end" }}
              >
                <TextWidget
                  text={`${dueCards}`}
                  style={{ fontSize: 32, color: textColor, fontWeight: "bold" }}
                />
                <TextWidget
                  text=" Cards"
                  style={{ fontSize: 16, color: textColor, marginLeft: 4 }}
                />
              </FlexWidget>
            ) : (
              <TextWidget
                text="All Caught Up"
                style={{ fontSize: 20, color: textColor, fontWeight: "bold" }}
              />
            )}
          </FlexWidget>

          {/* 3. ACTION BUTTON WRAPPER (Replaces alignSelf) */}
          <FlexWidget
            style={{ width: "match_parent", justifyContent: "flex-start" }}
          >
            <FlexWidget
              style={{
                backgroundColor:
                  dueCards > 0 ? actionColor : ("#ffffff33" as ColorProp),
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
              clickAction="OPEN_APP"
            >
              <TextWidget
                text={dueCards > 0 ? "Start Session" : "Great Job 🎉"}
                style={{ fontSize: 12, color: textColor, fontWeight: "bold" }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>

        {/* PENGUIN */}
        <FlexWidget
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-end",
            width: 80,
          }}
        >
          <ImageWidget
            image={require("@/assets/images/main.png")}
            imageWidth={80}
            imageHeight={80}
            style={{ marginBottom: 10 }}
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
