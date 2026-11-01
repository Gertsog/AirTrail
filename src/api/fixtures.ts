import type { ControlPoint, EmissionSource, PollutantId, RegionInfo } from '../types';

export const HOURS = 48;
export const PAST_HOURS = 12;

/** Демо-регион. На реальном бэкенде регион приходит в ответе прогноза. */
export const REGION: RegionInfo = {
  id: 'pavlodar',
  name: 'Павлодар',
  timeZone: 'Asia/Almaty',
  center: { lat: 52.325, lng: 76.965 },
  zoom: 10.6,
  bounds: [
    [76.8, 52.15],
    [77.08, 52.42],
  ],
};

export const BACKGROUND: Record<PollutantId, number> = {
  CO: 0.2,
  NO2: 9,
  SO2: 3,
  O3: 45,
  'PM2.5': 4,
  PM10: 8,
  AQI: 0,
};

export const SOURCES: EmissionSource[] = [
  {
    id: 'src-tec2',
    name: 'Павлодарская ТЭЦ-2',
    position: { lat: 52.3716, lng: 76.9851 },
    stackHeight: 150,
    stackDiameter: 6.5,
    exitVelocity: 13,
    temperature: 140,
    emissions: { CO: 210, NO2: 34, SO2: 58, O3: 9, 'PM2.5': 18, PM10: 30 },
  },
  {
    id: 'src-tec3',
    name: 'Павлодарская ТЭЦ-3',
    position: { lat: 52.3667, lng: 76.9339 },
    stackHeight: 180,
    stackDiameter: 7.5,
    exitVelocity: 15,
    temperature: 150,
    emissions: { CO: 320, NO2: 58, SO2: 110, O3: 14, 'PM2.5': 28, PM10: 46 },
  },
];

export const CONTROL_POINTS: ControlPoint[] = [
  { id: 'cp-center', name: 'Павлодар, центр', position: { lat: 52.2873, lng: 76.9455 } },
  { id: 'cp-zhilgorodok', name: 'Жилгородок', position: { lat: 52.3005, lng: 76.923 } },
  { id: 'cp-severny', name: 'Павлодар-Северный', position: { lat: 52.336, lng: 76.8858 } },
  { id: 'cp-khimgorodok', name: 'Химгородок', position: { lat: 52.345, lng: 76.995 } },
  { id: 'cp-vostochny', name: 'Восточный', position: { lat: 52.285, lng: 77.02 } },
  { id: 'cp-yuzhny', name: 'Южный', position: { lat: 52.2258, lng: 77.0283 } },
  { id: 'cp-zaton', name: 'Затон', position: { lat: 52.2588, lng: 76.9471 } },
  { id: 'cp-dalny', name: 'Дальний', position: { lat: 52.315, lng: 76.855 } },
  { id: 'cp-novostroyka', name: 'Новостройка', position: { lat: 52.305, lng: 76.895 } },
  { id: 'cp-pavlodarskoe', name: 'Павлодарское', position: { lat: 52.3881, lng: 76.8614 } },
  { id: 'cp-kenzhekol', name: 'Кенжеколь', position: { lat: 52.1787, lng: 77.0341 } },
  { id: 'cp-atameken', name: 'Атамекен', position: { lat: 52.32, lng: 76.83 } },
];
