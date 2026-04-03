'use client';
import { useState, useEffect } from 'react';
import { Editor } from '@/components/Editor';

const INITIAL_HTML = `
<h1 style="text-align: center">Q4 2025 Revenue Report</h1>
<h2>Executive Summary</h2>
<p>Revenue grew 23% year-over-year, driven primarily by enterprise expansion. Our <strong>cloud platform</strong> continues to be the primary growth driver.</p>
<figure><img src="/sample.png" alt="Revenue chart" /><figcaption>Fig 1. Revenue growth Q3-Q4 2025</figcaption></figure>
<h2>Key Metrics</h2>
<table>
  <thead><tr><th>Metric</th><th>Q3 2025</th><th>Q4 2025</th><th>Change</th></tr></thead>
  <tbody>
    <tr><td>ARR</td><td>$42M</td><td>$51M</td><td>+21%</td></tr>
    <tr><td>Net Revenue</td><td>$12.5M</td><td>$15.4M</td><td>+23%</td></tr>
    <tr><td>Customers</td><td>340</td><td>412</td><td>+21%</td></tr>
    <tr><td>NRR</td><td>118%</td><td>122%</td><td>+4pp</td></tr>
  </tbody>
</table>
<p>The <mark>enterprise segment</mark> showed the strongest growth, contributing 67% of new ARR.</p>
<p>Mid-market expansion was <strong>ahead of plan</strong> by 12%, driven by the new self-serve onboarding flow.</p>
<blockquote><p>We're seeing unprecedented demand in the mid-market segment. The pipeline for Q1 is already 40% larger than this time last year.<br/>— Sarah Chen, VP Sales</p></blockquote>
<h2>Regional Breakdown</h2>
<ul>
  <li>North America: +28% YoY</li>
  <li>EMEA: +19% YoY</li>
  <li>APAC: +31% YoY (fastest growing)</li>
</ul>
<hr />
<h2>Outlook</h2>
<p>We expect continued growth through H1 2026, with particular strength in healthcare and financial services verticals.</p>
<p>Key risks include macro headwinds in European markets and potential currency effects on APAC revenue.</p>
<h2>Appendix</h2>
<p>Detailed breakdown by vertical available in the supplementary data.</p>
`;

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Editor
        initialContent={INITIAL_HTML}
        onChange={(html) => {
          // Future: serialize to mdxx and pass to WASM parser
        }}
      />
    </div>
  );
}
