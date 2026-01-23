// import WidgetKit
// import SwiftUI
// import AppIntents

// // This matches the ConfigurationAppIntent in the example
// struct ConfigurationAppIntent: WidgetConfigurationIntent {
//     static var title: LocalizedStringResource { "Configuration" }
//     @Parameter(title: "Show Streak", default: true)
//     var showStreak: Bool
// }

// struct Provider: AppIntentTimelineProvider {
//     func placeholder(in context: Context) -> SimpleEntry {
//         SimpleEntry(date: Date(), dueCards: 5)
//     }

//     func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
//         SimpleEntry(date: Date(), dueCards: getDueCount())
//     }
    
//     func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
//         let entry = SimpleEntry(date: Date(), dueCards: getDueCount())
//         return Timeline(entries: [entry], policy: .atEnd)
//     }

//     private func getDueCount() -> Int {
//         let defaults = UserDefaults(suiteName: "group.com.brainguin.app")
//         guard let json = defaults?.string(forKey: "stats"),
//               let data = json.data(using: .utf8),
//               let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return 0 }
//         return dict["dueCards"] as? Int ?? 0
//     }
// }

// struct SimpleEntry: TimelineEntry {
//     let date: Date
//     let dueCards: Int
// }

// struct WidgetEntryView : View {
//     var entry: Provider.Entry
//     var body: some View {
//         ZStack {
//             Color(entry.dueCards > 0 ? .orange : .green)
//             VStack(alignment: .leading) {
//                 Text(entry.dueCards > 0 ? "DAILY MISSION" : "COMPLETE")
//                     .font(.caption2).bold()
//                 Text(entry.dueCards > 0 ? "\(entry.dueCards) Cards" : "All Caught Up")
//                     .font(.headline)
//                 Spacer()
//                 Text("🐧").font(.largeTitle) // Placeholder to avoid image crashes
//             }
//             .padding()
//             .foregroundColor(.white)
//         }
//     }
// }

// struct DailyWidget: Widget {
//     let kind: String = "DailyWidget" // New version to force refresh

//     var body: some WidgetConfiguration {
//         AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
//             WidgetEntryView(entry: entry)
//                 .containerBackground(.fill.tertiary, for: .widget)
//         }
//         .supportedFamilies([.systemSmall, .systemMedium])
//     }
// }

import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }

//    func relevances() async -> WidgetRelevances<ConfigurationAppIntent> {
//        // Generate a list containing the contexts this widget is relevant in.
//    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
}

struct widgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Time:")
            Text(entry.date, style: .time)

            Text("Favorite Emoji:")
            Text(entry.configuration.favoriteEmoji)
        }
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
    SimpleEntry(date: .now, configuration: .starEyes)
}
