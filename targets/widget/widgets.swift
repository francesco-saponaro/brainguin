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
        SimpleEntry(date: Date(), stats: Stats(streak: 5, dueCards: 10, memorized: 100))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let stats = fetchStats()
        completion(SimpleEntry(date: Date(), stats: stats))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let stats = fetchStats()
        let entry = SimpleEntry(date: Date(), stats: stats)
        
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func fetchStats() -> Stats {
        let defaults = UserDefaults(suiteName: "group.com.brainguin.app")
        guard let json = defaults?.string(forKey: "stats"),
              let data = json.data(using: .utf8),
              let stats = try? JSONDecoder().decode(Stats.self, from: data) else {
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
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry
    
    // Colors
    let colorPrimary = Color(hex: "0F172A")
    let colorGreen = Color(hex: "16a34a")
    let colorAccent = Color(hex: "38BDF8")
    let colorAction = Color(hex: "F97316")
    let colorWhiteOp10 = Color.white.opacity(0.1)
    
    var body: some View {
        let hasDueCards = entry.stats.dueCards > 0
        let bgColor = hasDueCards ? colorPrimary : colorGreen
        
        let isSmall = family == .systemSmall
        
        GeometryReader { geo in
            ZStack {
                // Background Color
                bgColor
                
                // Background Decor (Circle)
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: isSmall ? 100 : 150, height: isSmall ? 100 : 150)
                    .position(x: geo.size.width - 10, y: geo.size.height - 10)
                
                HStack {
                    VStack(alignment: .leading, spacing: isSmall ? 4 : 6) {
                        
                        // 1. TOP PILL LABEL (Restored but Tiny)
                        Text(hasDueCards ? "DAILY MISSION" : "MISSION COMPLETE")
                            .font(.system(size: isSmall ? 8 : 10, weight: .bold)) // Tiny font for small
                            .tracking(isSmall ? 0 : 2)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .foregroundColor(colorAccent)
                            .padding(.horizontal, isSmall ? 4 : 8) // Tighter padding
                            .padding(.vertical, isSmall ? 2 : 4)   // Tighter padding
                            .background(colorWhiteOp10)
                            .clipShape(Capsule())
                        
                        // 2. MAIN TEXT
                        if hasDueCards {
                            Text("\(entry.stats.dueCards)")
                                .font(.system(size: isSmall ? 28 : 32, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            + Text(" Cards")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white)
                        } else {
                            // Small widget gets 14px font
                            Text("All Caught Up")
                                .font(.system(size: isSmall ? 14 : 20, weight: .bold))
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        // 3. BUTTON / BADGE
                        if hasDueCards {
                            Text("Start Session")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.vertical, 8)
                                .padding(.horizontal, isSmall ? 12 : 16)
                                .background(colorAction)
                                .cornerRadius(12)
                        } else {
                            Text("Great Job 🎉")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.vertical, 8)
                                .padding(.horizontal, isSmall ? 12 : 16)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(12)
                        }
                    }
                    Spacer()
                }
                // TIGHTER OVERALL PADDING (10 for small, 16 for medium)
                .padding(isSmall ? 2 : 16)
                
                // 4. PENGUIN IMAGE
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Image("PENGUIN_SIGN")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: isSmall ? 50 : 80)
                            .offset(x: isSmall ? 15 : 10, y: isSmall ? 15 : 10)
                    }
                }
            }
        }
        .widgetURL(URL(string: hasDueCards ? "brainguin://study/daily" : "brainguin://"))
        .containerBackground(for: .widget) {
            bgColor
        }
    }
}

// --- 5. MAIN CONFIG ---
@main
struct DailyWidget: Widget {
    let kind: String = "BrainGuinDaily" // Version bump

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