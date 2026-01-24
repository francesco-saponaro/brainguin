import WidgetKit
import SwiftUI

// --- 1. DATA MODEL ---
struct Stats: Codable {
    let streak: Int
    let dueCards: Int
    let memorized: Int
}

// --- 2. PROVIDER (Data Fetcher) ---
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        // Default "Preview" state
        SimpleEntry(date: Date(), stats: Stats(streak: 5, dueCards: 10, memorized: 100))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let stats = fetchStats()
        completion(SimpleEntry(date: Date(), stats: stats))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let stats = fetchStats()
        let entry = SimpleEntry(date: Date(), stats: stats)
        
        // Refresh policy: Update 15 mins later or when app calls reloadWidget()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    // Helper to read shared JSON
    private func fetchStats() -> Stats {
        let defaults = UserDefaults(suiteName: "group.com.brainguin.app")
        guard let json = defaults?.string(forKey: "stats"),
              let data = json.data(using: .utf8),
              let stats = try? JSONDecoder().decode(Stats.self, from: data) else {
            // Fallback if no data found yet
            return Stats(streak: 0, dueCards: 0, memorized: 0)
        }
        return stats
    }
}

// --- 3. ENTRY ---
struct SimpleEntry: TimelineEntry {
    let date: Date
    let stats: Stats
}

// --- 4. VIEW (The UI) ---
struct WidgetEntryView : View {
    var entry: Provider.Entry
    
    // Define your colors manually to match Tailwind
    let colorPrimary = Color(hex: "0F172A") // Deep Slate
    let colorGreen = Color(hex: "16a34a")   // Success Green
    let colorAccent = Color(hex: "38BDF8")  // Blue Text
    let colorAction = Color(hex: "F97316")  // Orange Button
    let colorWhiteOp10 = Color.white.opacity(0.1)
    
    var body: some View {
        let hasDueCards = entry.stats.dueCards > 0
        let bgColor = hasDueCards ? colorPrimary : colorGreen
        
        GeometryReader { geo in
            ZStack {
                // Background Color
                bgColor
                
                // Background Decor (Circle)
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 150, height: 150)
                    .position(x: geo.size.width - 10, y: geo.size.height - 10)
                
                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        
                        // Top Pill Label
                        Text(hasDueCards ? "DAILY MISSION" : "MISSION COMPLETE")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(2) // Letter spacing
                            .foregroundColor(colorAccent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(colorWhiteOp10)
                            .clipShape(Capsule())
                        
                        // Main Number Text
                        if hasDueCards {
                            Text("\(entry.stats.dueCards)")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            + Text(" Cards")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                        } else {
                            Text("All Caught Up")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        // "Button" Look
                        if hasDueCards {
                            Text("Start Session")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                                .background(colorAction)
                                .cornerRadius(12)
                        } else {
                            Text("Great Job 🎉")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(12)
                        }
                    }
                    Spacer()
                }
                .padding()
                
                // Penguin Image (Bottom Right)
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        // Ensure your asset catalog has an image named "PENGUIN_SIGN"
                        Image("PENGUIN_SIGN")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: 80)
                            .offset(x: 10, y: 10) // Nudge it into corner
                    }
                }
            }
        }
        // DEEP LINK: Tapping widget opens specific screen
        .widgetURL(URL(string: hasDueCards ? "brainguin://study/daily" : "brainguin://home"))
        .containerBackground(for: .widget) {
            bgColor
        }
    }
}

// --- 5. MAIN CONFIG ---
@main
struct DailyWidget: Widget {
    let kind: String = "BrainGuinDaily"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Mission")
        .description("Track your due cards.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// --- 6. HEX COLOR HELPER ---
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

// import WidgetKit
// import SwiftUI

// // 1. The Provider
// struct Provider: TimelineProvider {
//     func placeholder(in context: Context) -> SimpleEntry {
//         SimpleEntry(date: Date())
//     }

//     func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
//         completion(SimpleEntry(date: Date()))
//     }

//     func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
//         let entry = SimpleEntry(date: Date())
//         // Refresh every hour
//         let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
//         completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
//     }
// }

// // 2. The Entry
// struct SimpleEntry: TimelineEntry {
//     let date: Date
// }

// // 3. The View
// struct WidgetEntryView : View {
//     var entry: Provider.Entry

//     var body: some View {
//         ZStack {
//             Color.white
//             VStack {
//                 Text("🐧")
//                     .font(.system(size: 50))
//                 Text("BrainGuin")
//                     .font(.headline)
//                     .foregroundColor(.black)
//                 Text("It Works!")
//                     .font(.caption)
//                     .foregroundColor(.gray)
//             }
//         }
//         // ESSENTIAL for iOS 17 container background
//         .containerBackground(for: .widget) {
//             Color.white
//         }
//     }
// }

// // 4. The Main Entry Point
// @main
// struct DailyWidget: Widget {
//     let kind: String = "BrainGuinDebugWidget"

//     var body: some WidgetConfiguration {
//         StaticConfiguration(kind: kind, provider: Provider()) { entry in
//             WidgetEntryView(entry: entry)
//         }
//         .configurationDisplayName("BrainGuin")
//         .description("Your daily study companion.")
//         .supportedFamilies([.systemSmall, .systemMedium])
//     }
// }