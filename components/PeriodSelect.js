"use client";

import { useRouter, useSearchParams } from "next/navigation";

import Select from "@/components/Select";
import { PERIODS } from "@/lib/constants";

export default function PeriodSelect({ value }) {
  const router = useRouter();
  const params = useSearchParams();

  function choisir(periode) {
    const next = new URLSearchParams(params);
    next.set("periode", periode);
    router.replace(`/bankroll?${next}`, { scroll: false });
  }

  return (
    <Select
      label="Période"
      variant="pill"
      align="end"
      value={value}
      onChange={choisir}
      options={PERIODS.map((p) => ({ value: p.key, label: p.label }))}
    />
  );
}
