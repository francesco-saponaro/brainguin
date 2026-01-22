import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    let storage = UserDefaults(suiteName: "group.com.brainguin.app")

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), dueCards: 5)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date(), dueCards: getDueCount()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(date: Date(), dueCards: getDueCount())
        completion(Timeline(entries: [entry], policy: .atEnd))
    }

    private func getDueCount() -> Int {
        guard let json = storage?.string(forKey: "stats"),
              let data = json.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return 0 }
        return dict["dueCards"] as? Int ?? 0
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let dueCards: Int
}

struct WidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            // Background Color (Matches your clsx logic)
            Color(entry.dueCards > 0 ? .systemOrange : .systemGreen)
            
            // Background Decor (The circle)
            Circle()
                .fill(Color.white.opacity(0.1))
                .frame(width: 150, height: 150)
                .offset(x: 80, y: 60)

            VStack(alignment: .leading, spacing: 4) {
                // Label
                Text(entry.dueCards > 0 ? "DAILY MISSION" : "MISSION COMPLETE")
                    .font(.system(size: 10, weight: .bold))
                    .kerning(1.2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(10)
                    .foregroundColor(.white)

                // Main Title
                Text(entry.dueCards > 0 ? "\(entry.dueCards) Cards to Review" : "All Caught Up")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 4)

                Spacer()

                HStack(alignment: .bottom) {
                    if entry.dueCards > 0 {
                        Text("Start Session")
                            .font(.system(size: 14, weight: .bold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.white)
                            .foregroundColor(entry.dueCards > 0 ? .orange : .green)
                            .cornerRadius(12)
                    } else {
                        Text("Great Job! 🎉")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    // Mascot (Must be in Assets.xcassets)
                    Image("PENGUIN_SIGN")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 70, height: 70)
                        .offset(x: 20, y: 10)
                }
            }
            .padding(16)
        }
        // DEEP LINK: Opens app to specific route
        .widgetURL(URL(string: "yourapp://study/daily"))
    }
}

@main
struct DailyWidget: Widget {
    let kind: String = "DailyWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Mission")
        .description("Quick view of your cards to review.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// import WidgetKit
// import SwiftUI

// struct Provider: AppIntentTimelineProvider {
//     func placeholder(in context: Context) -> SimpleEntry {
//         SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
//     }

//     func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
//         SimpleEntry(date: Date(), configuration: configuration)
//     }
    
//     func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
//         var entries: [SimpleEntry] = []

//         // Generate a timeline consisting of five entries an hour apart, starting from the current date.
//         let currentDate = Date()
//         for hourOffset in 0 ..< 5 {
//             let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
//             let entry = SimpleEntry(date: entryDate, configuration: configuration)
//             entries.append(entry)
//         }

//         return Timeline(entries: entries, policy: .atEnd)
//     }

// //    func relevances() async -> WidgetRelevances<ConfigurationAppIntent> {
// //        // Generate a list containing the contexts this widget is relevant in.
// //    }
// }

// struct SimpleEntry: TimelineEntry {
//     let date: Date
//     let configuration: ConfigurationAppIntent
// }

// struct widgetEntryView : View {
//     var entry: Provider.Entry

//     var body: some View {
//         VStack {
//             Text("Time:")
//             Text(entry.date, style: .time)

//             Text("Favorite Emoji:")
//             Text(entry.configuration.favoriteEmoji)
//         }
//     }
// }

// struct widget: Widget {
//     let kind: String = "widget"

//     var body: some WidgetConfiguration {
//         AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
//             widgetEntryView(entry: entry)
//                 .containerBackground(.fill.tertiary, for: .widget)
//         }
//     }
// }

// extension ConfigurationAppIntent {
//     fileprivate static var smiley: ConfigurationAppIntent {
//         let intent = ConfigurationAppIntent()
//         intent.favoriteEmoji = "😀"
//         return intent
//     }
    
//     fileprivate static var starEyes: ConfigurationAppIntent {
//         let intent = ConfigurationAppIntent()
//         intent.favoriteEmoji = "🤩"
//         return intent
//     }
// }

// #Preview(as: .systemSmall) {
//     widget()
// } timeline: {
//     SimpleEntry(date: .now, configuration: .smiley)
//     SimpleEntry(date: .now, configuration: .starEyes)
// }
