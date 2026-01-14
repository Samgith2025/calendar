import WidgetKit
import SwiftUI

// MARK: - Data Models

struct DayLog: Codable {
    let date: String
    let status: String
    let noTradeDay: Bool?
}

struct WidgetSettings: Codable {
    let theme: String
    let accentColor: String
    let showCompletionIndicator: Bool
}

struct AppData: Codable {
    let logs: [String: DayLog]
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> TradingEntry {
        TradingEntry(date: Date(), logs: [:], settings: defaultSettings())
    }

    func getSnapshot(in context: Context, completion: @escaping (TradingEntry) -> ()) {
        let entry = TradingEntry(date: Date(), logs: loadLogs(), settings: loadSettings())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TradingEntry>) -> ()) {
        let currentDate = Date()
        let entry = TradingEntry(date: currentDate, logs: loadLogs(), settings: loadSettings())

        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadLogs() -> [String: DayLog] {
        guard let userDefaults = UserDefaults(suiteName: "group.com.samson.tradingtracker"),
              let data = userDefaults.data(forKey: "trading_tracker_data"),
              let appData = try? JSONDecoder().decode(AppData.self, from: data) else {
            return [:]
        }
        return appData.logs
    }

    private func loadSettings() -> WidgetSettings {
        guard let userDefaults = UserDefaults(suiteName: "group.com.samson.tradingtracker"),
              let data = userDefaults.data(forKey: "widget_settings"),
              let settings = try? JSONDecoder().decode(WidgetSettings.self, from: data) else {
            return defaultSettings()
        }
        return settings
    }

    private func defaultSettings() -> WidgetSettings {
        return WidgetSettings(theme: "dark", accentColor: "#22c55e", showCompletionIndicator: true)
    }
}

// MARK: - Timeline Entry

struct TradingEntry: TimelineEntry {
    let date: Date
    let logs: [String: DayLog]
    let settings: WidgetSettings
}

// MARK: - Widget View

struct TradingTrackerWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    private var isDarkMode: Bool {
        entry.settings.theme == "dark"
    }

    private var backgroundColor: Color {
        isDarkMode ? Color(hex: "#1f2937") : Color(hex: "#ffffff")
    }

    private var textColor: Color {
        isDarkMode ? Color.white : Color(hex: "#1f2937")
    }

    private var secondaryTextColor: Color {
        isDarkMode ? Color(hex: "#9ca3af") : Color(hex: "#6b7280")
    }

    private var accentColor: Color {
        Color(hex: entry.settings.accentColor)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                backgroundColor

                VStack(alignment: .leading, spacing: 6) {
                    headerView

                    if family == .systemSmall {
                        dotGridView(width: geometry.size.width - 24, dotSize: 6, gap: 2)
                    } else {
                        dotGridView(width: geometry.size.width - 24, dotSize: 8, gap: 3)
                    }
                }
                .padding(12)
            }
        }
    }

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text("Trading Rules")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(textColor)

                let stats = calculateStats()
                Text("\(stats.greenDays)/\(stats.totalDays) days")
                    .font(.system(size: 10))
                    .foregroundColor(secondaryTextColor)
            }

            Spacer()

            if entry.settings.showCompletionIndicator {
                let stats = calculateStats()
                Text("\(stats.rate)%")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(stats.rate >= 80 ? Color(hex: "#22c55e") : stats.rate >= 50 ? textColor : Color(hex: "#ef4444"))
            }
        }
    }

    private func dotGridView(width: CGFloat, dotSize: CGFloat, gap: CGFloat) -> some View {
        let dots = getTrackingDots()

        // Calculate how many dots fit per row
        let dotsPerRow = Int((width + gap) / (dotSize + gap))

        return VStack(alignment: .leading, spacing: gap) {
            // Wrap dots in rows
            ForEach(0..<((dots.count + dotsPerRow - 1) / dotsPerRow), id: \.self) { rowIndex in
                HStack(spacing: gap) {
                    ForEach(0..<dotsPerRow, id: \.self) { colIndex in
                        let index = rowIndex * dotsPerRow + colIndex
                        if index < dots.count {
                            Circle()
                                .fill(dots[index])
                                .frame(width: dotSize, height: dotSize)
                        } else {
                            Circle()
                                .fill(Color.clear)
                                .frame(width: dotSize, height: dotSize)
                        }
                    }
                }
            }
        }
    }

    private func getTrackingDots() -> [Color] {
        let calendar = Calendar.current
        let now = Date()

        // Find the first tracking day from logs
        let sortedDates = entry.logs.keys.sorted()
        guard let firstDateString = sortedDates.first,
              let firstDate = dateFromString(firstDateString) else {
            return []
        }

        var dots: [Color] = []
        var currentDay = firstDate

        // Generate dots from first tracking day to today (weekdays only)
        while currentDay <= now {
            if !calendar.isDateInWeekend(currentDay) {
                let dateString = stringFromDate(currentDay)

                if let log = entry.logs[dateString] {
                    if log.status == "green" {
                        dots.append(Color(hex: "#22c55e"))
                    } else {
                        dots.append(Color(hex: "#ef4444"))
                    }
                } else {
                    // No log = missed (red)
                    dots.append(Color(hex: "#ef4444"))
                }
            }
            currentDay = calendar.date(byAdding: .day, value: 1, to: currentDay)!
        }

        return dots
    }

    private func dateFromString(_ string: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: string)
    }

    private func stringFromDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private func calculateStats() -> (greenDays: Int, totalDays: Int, rate: Int) {
        let calendar = Calendar.current
        let now = Date()

        // Find the first tracking day
        let sortedDates = entry.logs.keys.sorted()
        guard let firstDateString = sortedDates.first,
              let firstDate = dateFromString(firstDateString) else {
            return (0, 0, 0)
        }

        var greenDays = 0
        var totalDays = 0
        var currentDay = firstDate

        while currentDay <= now {
            if !calendar.isDateInWeekend(currentDay) {
                totalDays += 1
                let dateString = stringFromDate(currentDay)

                if let log = entry.logs[dateString], log.status == "green" {
                    greenDays += 1
                }
            }
            currentDay = calendar.date(byAdding: .day, value: 1, to: currentDay)!
        }

        let rate = totalDays > 0 ? Int((Double(greenDays) / Double(totalDays)) * 100) : 0

        return (greenDays, totalDays, rate)
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Widget Configuration

@main
struct TradingTrackerWidget: Widget {
    let kind: String = "TradingTrackerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TradingTrackerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Trading Tracker")
        .description("Track your daily trading rule adherence.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

struct TradingTrackerWidget_Previews: PreviewProvider {
    static var previews: some View {
        TradingTrackerWidgetEntryView(
            entry: TradingEntry(
                date: Date(),
                logs: [:],
                settings: WidgetSettings(theme: "dark", accentColor: "#22c55e", showCompletionIndicator: true)
            )
        )
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
