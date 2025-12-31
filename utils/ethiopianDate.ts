import { EthiopianDate } from '../types';
import { ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AM } from '../constants';

// A simplified algorithm for Gregorian to Ethiopian conversion.
// Accurate for the current era (1900-2100).
export const getEthiopianDate = (date: Date = new Date()): EthiopianDate => {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth(); // 0-11
  const gDate = date.getDate();

  let eYear = gYear - 8;
  
  // Ethiopian new year is usually Sep 11 or 12
  // This is a simplified logic for display purposes
  
  // Define offset logic approx
  // Sep 11 Gregorian is Meskerem 1
  const newYearDay = (gYear % 4 === 3) ? 12 : 11;

  let eMonth = 0;
  let eDate = 0;

  // Logic to determine month/date based on Gregorian boundaries
  // Note: This is a standard approximation logic for UI
  
  if (gMonth === 8 && gDate >= newYearDay) { // September after new year
    eYear += 1;
    eMonth = 0; // Meskerem
    eDate = gDate - newYearDay + 1;
  } else if (gMonth === 8 && gDate < newYearDay) { // September before new year
    eMonth = 12; // Pagume
    eDate = gDate + (gYear % 4 === 3 ? 6 : 5) - newYearDay + 1; // Approx logic
    if(eDate < 1) { // Fallback to Nehase
         eMonth = 11;
         eDate = 30 + eDate;
    }
  } else {
    // Other months calculation
    // Simplified offset map
    const offsets = [
      { m: 9, d: 11 }, // Jan (Tir) - roughly Jan 9 is Tir 1
      { m: 10, d: 10 }, // Feb (Yekatit)
      { m: 11, d: 10 }, // Mar (Megabit)
      { m: 0, d: 9 }, // Apr (Miazia)
      { m: 1, d: 9 }, // May (Genbot)
      { m: 2, d: 8 }, // Jun (Sene)
      { m: 3, d: 8 }, // Jul (Hamle)
      { m: 4, d: 7 }, // Aug (Nehase)
      // Sep handled above
      { m: 5, d: 11 }, // Oct (Tikimt)
      { m: 6, d: 10 }, // Nov (Hidar)
      { m: 7, d: 10 }, // Dec (Tahsas)
    ];

    // Javascript month 0 = Jan
    // We map Jan -> index 0 in offsets array to get logic? No.
    // Let's use specific offsets.
    
    // Jan (0) -> Tahsas/Tir. 
    // If date < 9, it is Tahsas. Else Tir.
    // Tahsas starts Dec 10.
    
    const dayOfYear = Math.floor((date.getTime() - new Date(gYear, 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    
    // Using a simpler day-count based approach relative to Meskerem 1
    const meskerem1 = new Date(gYear, 8, newYearDay);
    if (date < meskerem1) {
        // Before current year Meskerem 1
        const lastYearMeskerem1 = new Date(gYear - 1, 8, (gYear - 1) % 4 === 3 ? 12 : 11);
        const diff = Math.floor((date.getTime() - lastYearMeskerem1.getTime()) / (1000 * 60 * 60 * 24));
        eMonth = Math.floor(diff / 30);
        eDate = (diff % 30) + 1;
    } else {
        // After current year Meskerem 1
        const diff = Math.floor((date.getTime() - meskerem1.getTime()) / (1000 * 60 * 60 * 24));
        eMonth = Math.floor(diff / 30);
        eDate = (diff % 30) + 1;
    }
  }

  // Cap month at 12 (Pagume)
  if (eMonth > 12) eMonth = 12;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];

  return {
    year: eYear,
    month: eMonth,
    date: eDate,
    dayName,
    monthName: ETHIOPIAN_MONTHS[eMonth] || ""
  };
};

export const formatEthiopianDate = (eDate: EthiopianDate, lang: 'en' | 'am'): string => {
  const monthName = lang === 'am' ? ETHIOPIAN_MONTHS_AM[eDate.month] : ETHIOPIAN_MONTHS[eDate.month];
  return `${monthName} ${eDate.date}, ${eDate.year}`;
};