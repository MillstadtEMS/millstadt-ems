import { redirect } from "next/navigation";
// Budget was projected-district content — one source of truth now lives under Referendum.
export default function Page() { redirect("/board/referendum/detailed"); }
