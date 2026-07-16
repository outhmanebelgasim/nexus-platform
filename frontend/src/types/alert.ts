export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "RESOLVED" | "IGNORED";

export interface AlertEvent {
  id: number;
  sensorId?: number;
  variableId: number;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  triggeredAt: string | null;
  resolvedAt: string | null;
}
