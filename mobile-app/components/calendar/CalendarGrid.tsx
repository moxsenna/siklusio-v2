import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { useCycle } from '../../src/context/CycleContext';

interface CalendarGridProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}

export function CalendarGrid({ currentMonth, setCurrentMonth, onSelectDate, selectedDate }: CalendarGridProps) {
  const { getDayInfo, activityHistory } = useCycle();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Senin
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Minggu

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDaysHeader = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const getMonthNameIndonesian = (date: Date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <View className="bg-white dark:bg-[#1c0f24] rounded-[32px] p-[24px] shadow-sm border border-pink-200 dark:border-[#ec4899]/15">
      {/* Month Navigation */}
      <View className="flex-row justify-between items-center mb-[32px]">
        <TouchableOpacity onPress={prevMonth} className="w-10 h-10 rounded-full bg-pink-100 dark:bg-purple-950/40 items-center justify-center">
          <Text className="text-lg font-bold text-primary dark:text-[#ec4899]">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-fuchsia-950 dark:text-[#fdf2f8]">{getMonthNameIndonesian(currentMonth)}</Text>
        <TouchableOpacity onPress={nextMonth} className="w-10 h-10 rounded-full bg-pink-100 dark:bg-purple-950/40 items-center justify-center">
          <Text className="text-lg font-bold text-primary dark:text-[#ec4899]">→</Text>
        </TouchableOpacity>
      </View>

      {/* Weekdays Header */}
      <View className="flex-row mb-[16px]">
        {weekDaysHeader.map(day => (
          <View key={day} style={{ width: '14.28%' }} className="items-center">
            <Text className="text-[10px] font-bold tracking-widest uppercase opacity-45 dark:opacity-80 text-fuchsia-950 dark:text-pink-300">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((date, i) => {
          const { displayPhase: status } = getDayInfo(date);
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isCurrentMonth = isSameMonth(date, currentMonth);
          
          const dateKey = format(date, 'yyyy-MM-dd');
          const record = activityHistory[dateKey];
          const isLoggedPeriod = record?.isPeriod;

          let bgClass = 'bg-transparent';
          let textClass = 'text-fuchsia-950 dark:text-[#fdf2f8]';
          
          if (isCurrentMonth) {
            if (status === 'Masa Subur') {
              bgClass = 'bg-secondary dark:bg-teal-950/60';
              textClass = 'text-on-secondary dark:text-teal-400 font-bold';
            } else if (status === 'Ovulasi') {
              bgClass = 'bg-tertiary dark:bg-teal-700';
              textClass = 'text-on-tertiary dark:text-white font-bold';
            }
            
            if (isLoggedPeriod) {
              bgClass = 'bg-primary dark:bg-pink-600';
              textClass = 'text-on-primary dark:text-white font-bold';
            } else if (status === 'Menstruasi') {
              bgClass = 'bg-primary/20 dark:bg-pink-950/40';
              textClass = 'text-primary dark:text-pink-400 font-bold';
            }
          }

          return (
            <View key={i} style={{ width: '14.28%', aspectRatio: 1 }} className="items-center justify-center">
              <TouchableOpacity 
                onPress={() => onSelectDate(date)}
                style={{ width: '80%', height: '80%', borderRadius: 9999 }}
                className={`items-center justify-center border ${
                  !isCurrentMonth ? 'opacity-25' : 'opacity-100'
                } ${isToday ? 'border-primary border-2' : 'border-transparent'} ${
                  isSelected ? 'bg-primary/25 border-primary/45 border' : ''
                } ${bgClass}`}
              >
                <Text className={`text-[13px] font-bold ${textClass}`}>{format(date, 'd')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View className="pt-[24px] mt-6 border-t border-pink-200/30 dark:border-[#ec4899]/15 flex-row flex-wrap justify-center gap-x-4 gap-y-2">
         <View className="flex-row items-center gap-[6px]">
           <View className="w-3 h-3 rounded-full bg-primary/20 dark:bg-pink-950/40" />
           <Text className="text-[10px] uppercase font-bold text-fuchsia-950/70 dark:text-pink-300">Prediksi Haid</Text>
         </View>
         <View className="flex-row items-center gap-[6px]">
           <View className="w-3 h-3 rounded-full bg-primary dark:bg-pink-600" />
           <Text className="text-[10px] uppercase font-bold text-fuchsia-950/70 dark:text-pink-300">Haid (Catatan)</Text>
         </View>
         <View className="flex-row items-center gap-[6px]">
           <View className="w-3 h-3 rounded-full bg-secondary dark:bg-teal-950/60" />
           <Text className="text-[10px] uppercase font-bold text-fuchsia-950/70 dark:text-pink-300">Subur</Text>
         </View>
         <View className="flex-row items-center gap-[6px]">
           <View className="w-3 h-3 rounded-full bg-tertiary dark:bg-teal-700" />
           <Text className="text-[10px] uppercase font-bold text-fuchsia-950/70 dark:text-pink-300">Ovulasi</Text>
         </View>
         <View className="flex-row items-center gap-[6px]">
           <View className="w-3 h-3 rounded-full border border-primary dark:border-[#ec4899] bg-transparent" />
           <Text className="text-[10px] uppercase font-bold text-fuchsia-950/70 dark:text-pink-300">Hari Ini</Text>
         </View>
      </View>
    </View>
  );
}
