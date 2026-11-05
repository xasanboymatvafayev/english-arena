export const groupColors = [
  { value: "violet", label: "Binafsha", dot: "bg-violet-400", soft: "bg-violet-500/10", text: "text-violet-400", gradient: "from-violet-500 to-indigo-600" },
  { value: "emerald", label: "Yashil", dot: "bg-emerald-400", soft: "bg-emerald-500/10", text: "text-emerald-400", gradient: "from-emerald-400 to-teal-600" },
  { value: "sky", label: "Moviy", dot: "bg-sky-400", soft: "bg-sky-500/10", text: "text-sky-400", gradient: "from-sky-400 to-blue-600" },
  { value: "amber", label: "Sariq", dot: "bg-amber-400", soft: "bg-amber-500/10", text: "text-amber-400", gradient: "from-amber-400 to-orange-600" },
  { value: "rose", label: "Pushti", dot: "bg-rose-400", soft: "bg-rose-500/10", text: "text-rose-400", gradient: "from-rose-400 to-pink-600" },
  { value: "slate", label: "Kulrang", dot: "bg-slate-400", soft: "bg-slate-500/10", text: "text-slate-400", gradient: "from-slate-400 to-slate-600" },
];

export function groupColor(value?: string | null) {
  return groupColors.find((item) => item.value === value) || groupColors[0];
}
