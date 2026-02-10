import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Linking } from "react-native";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { AndroidWidget } from "./AndroidWidget";

const nameToWidget = {
  // Hello will be the **name** with which we will reference our widget.
  Android: AndroidWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo as any;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      let data = widgetInfo.props;

      if (
        !data ||
        !data.dueCards ||
        data.dueCards === undefined ||
        data.dueCards === 0
      ) {
        try {
          const savedData = await AsyncStorage.getItem("widget_last_data");
          if (savedData) {
            data = JSON.parse(savedData);
            console.log("WIDGET_LOG: Data restored from Storage");
          } else {
            console.log("WIDGET_LOG: Storage was empty!");
          }
        } catch (e) {
          console.log("WIDGET_LOG: Storage Error:", e);
        }
      }

      // If data is STILL empty, render a "Please open app" state
      props.renderWidget(<Widget {...(data || { dueCards: 0 })} />);
      break;

    case "WIDGET_CLICK":
      if (props.clickAction) {
        Linking.openURL(props.clickAction);
      } else {
        Linking.openURL("brainguin://");
      }
      break;

    default:
      break;
  }
}
