import { getMillstadtSkyFeatures } from "@/lib/integrations/astronomy/public-status";
import { getFlagStatus } from "@/lib/integrations/flags/public-status";
import { getSchoolEventStatus } from "@/lib/integrations/schools/public-status";
import { getProfessionalSportsStatus } from "@/lib/integrations/sports/public-status";

export type TodayRailItem = {
  title: string;
  label: string;
  href: string;
  tone: "gold" | "blue" | "cyan" | "green";
  detail: string;
};

export const todayRailItems: TodayRailItem[] = [
  {
    title: "Community calendar",
    label: "Official EMS calendar",
    href: "/events",
    tone: "gold",
    detail: "Public visits, classes, and community events live on the calendar page.",
  },
  {
    title: "Weather",
    label: "National Weather Service",
    href: "/weather",
    tone: "cyan",
    detail: "Forecast and radar stay on the existing weather page.",
  },
  {
    title: "Kids Club",
    label: "Family safety missions",
    href: "/kids-club/games",
    tone: "green",
    detail: "New interactive safety games give families a reason to come back.",
  },
  {
    title: "Today Around Millstadt",
    label: "Source-aware hub",
    href: "/community/today",
    tone: "blue",
    detail: "Sports, schools, flags, sky, and event slots stay honest until official sources are connected.",
  },
];

export function getTodayAroundMillstadt() {
  return {
    sports: getProfessionalSportsStatus(),
    flags: getFlagStatus(),
    sky: getMillstadtSkyFeatures(),
    schools: getSchoolEventStatus(),
  };
}
