import WidgetKit
import SwiftUI

// 1. The Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(date: Date())
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// 2. The Entry
struct SimpleEntry: TimelineEntry {
    let date: Date
}

// 3. The View
struct WidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color.white
            VStack {
                Text("🐧")
                    .font(.system(size: 50))
                Text("BrainGuin")
                    .font(.headline)
                    .foregroundColor(.black)
                Text("It Works!")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        // ESSENTIAL for iOS 17 container background
        .containerBackground(for: .widget) {
            Color.white
        }
    }
}

// 4. The Main Entry Point
@main
struct DailyWidget: Widget {
    let kind: String = "BrainGuinDebugWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("BrainGuin")
        .description("Your daily study companion.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}