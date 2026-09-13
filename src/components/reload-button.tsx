"use client";
export function ReloadButton() {
  return <button className="reload-button" onClick={() => window.location.reload()}>再読み込みする</button>;
}
