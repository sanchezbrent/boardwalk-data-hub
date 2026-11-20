import { useEffect, useRef } from "react";
import { installPlugin, type WorkspaceBridge } from "boardwalk-data-hub";
import { manifest, mount } from "boardwalk-data-hub/ui";
/** Reference only: add through Boardwalk's lazy route map after its host API lands. */
export function DataHubPluginRoute({
  enabled,
  bridge,
}: {
  enabled: boolean;
  bridge: WorkspaceBridge;
}) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target.current) return;
    return installPlugin({
      enabled,
      allowedId: "data-hub",
      allowedVersion: "0.1.0",
      allowedCapabilities: [
        "data-hub.read",
        "data-hub.edit",
        "data-hub.validate",
        "data-hub.approve",
      ],
      hostApiVersion: 1,
      module: { manifest, mount },
      target: target.current,
      bridge,
    });
  }, [enabled, bridge]);
  return enabled ? <div ref={target} /> : <p>This workspace is unavailable.</p>;
}
