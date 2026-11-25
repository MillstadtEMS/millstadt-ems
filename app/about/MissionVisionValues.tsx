import GingerbreadHouse from "./GingerbreadHouse";
import PillarsTemple from "./PillarsTemple";
import SeasonalMonument from "./SeasonalMonument";
import { PILLARS, type CoreValue } from "./pillars";

/** Mission, vision, Pillars of Excellence and core values in the current season's look. */
export default function MissionVisionValues({
  initialWinter,
  mission,
  vision,
  values,
}: {
  initialWinter: boolean;
  mission: string;
  vision: string;
  values: readonly CoreValue[];
}) {
  const content = { mission, vision, pillars: PILLARS, values };
  return (
    <SeasonalMonument
      initialWinter={initialWinter}
      winter={<GingerbreadHouse {...content} />}
      normal={<PillarsTemple {...content} />}
    />
  );
}
