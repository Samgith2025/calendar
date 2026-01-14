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

                VStack(alignment: .leading, spacing: 8) {
                    headerView

                    if family == .systemSmall {
                        smallGridView(width: geometry.size.width - 24)
                    } else {
                        mediumGridView(width: geometry.size.width - 24)
                    }
                }
                .padding(12)
            }
        }
    }

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(monthYearString())
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(textColor)
                Text("Trading Rules")
                    .font(.system(size: 10))
                    .foregroundColor(secondaryTextColor)
            }

            Spacer()

            if entry.settings.showCompletionIndicator {
                let stats = calculateStats()
                Text("\(stats.rate)%")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(accentColor)
            }
        }
    }

    private func smallGridView(width: CGFloat) -> some View {
        let days = getMonthDays()
        let columns = 7
        let boxSize: CGFloat = (width - CGFloat(columns - 1) * 3) / CGFloat(columns)

        return VStack(spacing: 3) {
            // Weekday labels
            HStack(spacing: 3) {
                ForEach(["M", "T", "W", "T", "F", "S", "S"], id: \.self) { day in
                    Text(day)
                        .font(.system(size: 8))
                        .foregroundColor(secondaryTextColor)
                        .frame(width: boxSize)
                }
            }

            // Day grid
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(boxSize), spacing: 3), count: columns), spacing: 3) {
                ForEach(days.indices, id: \.self) { index in
                    dayBox(for: days[index], size: boxSize)
                }
            }
        }
    }

    private func mediumGridView(width: CGFloat) -> some View {
        let days = getMonthDays()
        let columns = 7
        let boxSize: CGFloat = min(24, (width - CGFloat(columns - 1) * 4) / CGFloat(columns))

        return VStack(spacing: 4) {
            // Weekday labels
            HStack(spacing: 4) {
                ForEach(["M", "T", "W", "T", "F", "S", "S"], id: \.self) { day in
                    Text(day)
                        .font(.system(size: 10))
                        .foregroundColor(secondaryTextColor)
                        .frame(width: boxSize)
                }
            }

            // Day grid
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(boxSize), spacing: 4), count: columns), spacing: 4) {
                ForEach(days.indices, id: \.self) { index in
                    dayBox(for: days[index], size: boxSize)
                }
            }
        }
    }

    private func dayBox(for day: Date?, size: CGFloat) -> some View {
        Group {
            if let day = day {
                let isWeekend = Calendar.current.isDateInWeekend(day)
                let status = getDayStatus(for: day)
                let boxColor = getBoxColor(status: status, isWeekend: isWeekend)

                RoundedRectangle(cornerRadius: size * 0.2)
                    .fill(boxColor)
                    .frame(width: size, height: size)
            } else {
                Color.clear
                    .frame(width: size, height: size)
            }
        }
    }

    private func getDayStatus(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)

        if let log = entry.logs[dateString] {
            return log.status
        }

        if date < Calendar.current.startOfDay(for: Date()) {
            return "grey"
        }

        return "none"
    }

    private func getBoxColor(status: String, isWeekend: Bool) -> Color {
        if isWeekend {
            return Color.clear
        }

        switch status {
        case "green":
            return Color(hex: "#22c55e")
        case "red":
            return Color(hex: "#ef4444")
        case "grey":
            return isDarkMode ? Color(hex: "#4b5563") : Color(hex: "#d1d5db")
        default:
            return isDarkMode ? Color(hex: "#374151") : Color(hex: "#e5e7eb")
        }
    }

    private func getMonthDays() -> [Date?] {
        let calendar = Calendar.current
        let now = Date()

        guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: now)),
              let monthEnd = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: monthStart) else {
            return []
        }

        var days: [Date?] = []

        // Add empty slots for days before the 1st
        let weekday = calendar.component(.weekday, from: monthStart)
        let mondayBasedWeekday = weekday == 1 ? 6 : weekday - 2
        for _ in 0..<mondayBasedWeekday {
            days.append(nil)
        }

        // Add all days of the month
        var currentDay = monthStart
        while currentDay <= monthEnd {
            days.append(currentDay)
            currentDay = calendar.date(byAdding: .day, value: 1, to: currentDay)!
        }

        return days
    }

    private func monthYearString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Date())
    }

    private func calculateStats() -> (streak: Int, rate: Int, missed: Int) {
        let calendar = Calendar.current
        let now = Date()

        guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else {
            return (0, 0, 0)
        }

        var greenDays = 0
        var redDays = 0
        var currentDay = monthStart

        while currentDay <= now {
            if !calendar.isDateInWeekend(currentDay) {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                let dateString = formatter.string(from: currentDay)

                if let log = entry.logs[dateString] {
                    if log.status == "green" {
                        greenDays += 1
                    } else if log.status == "red" {
                        redDays += 1
                    }
                }
            }
            currentDay = calendar.date(byAdding: .day, value: 1, to: currentDay)!
        }

        let total = greenDays + redDays
        let rate = total > 0 ? Int((Double(greenDays) / Double(total)) * 100) : 0

        return (greenDays, rate, redDays)
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
