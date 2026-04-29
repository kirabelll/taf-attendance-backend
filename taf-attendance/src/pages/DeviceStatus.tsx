import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { 
  useDevices, 
  useDeviceStats, 
  useSyncDevice, 
  useUpdateDeviceStatus, 
  useTestDeviceConnection,
  useDeviceLogs,
  useConnectionTest 
} from "@/hooks/useAttendanceData";
import { 
  Wifi, WifiOff, RefreshCw, Activity, Server, MapPin, Clock, 
  Loader2, AlertCircle, CheckCircle, Settings, Eye, Wrench,
  Zap, Shield, HardDrive, Network
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock devices as fallback when API is not available
const mockDevices = [
  { 
    id: "VDE225240197", 
    name: "Entry", 
    ip: "172.16.10.210", 
    location: "Main Door", 
    status: "Online" as const, 
    last_sync: "2026-03-12 09:40:25", 
    total_scans: 30372, 
    model: "ZKBioTime Device",
    firmware_version: "6.60.1.0",
    sync_errors: 0,
    user_count: 120,
    fp_count: 1,
    face_count: 112,
    palm_count: 0
  },
  { 
    id: "VDE225240198", 
    name: "Main Door", 
    ip: "172.16.10.211", 
    location: "Main Door", 
    status: "Online" as const, 
    last_sync: "2026-03-12 09:40:30", 
    total_scans: 43115, 
    model: "ZKBioTime Device",
    firmware_version: "6.60.1.0",
    sync_errors: 0,
    user_count: 123,
    fp_count: 1,
    face_count: 107,
    palm_count: 0
  }
];
export default function DeviceStatus() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Fetch data
  const { 
    data: devicesData, 
    isLoading: isDevicesLoading, 
    error: devicesError,
    refetch: refetchDevices
  } = useDevices();

  const { 
    data: statsData, 
    isLoading: isStatsLoading 
  } = useDeviceStats();

  const { 
    data: connectionData, 
    isLoading: isConnectionLoading, 
    error: connectionError 
  } = useConnectionTest();

  const { 
    data: logsData, 
    isLoading: isLogsLoading 
  } = useDeviceLogs(selectedDevice || '', showLogs && !!selectedDevice);

  // Mutations
  const syncDeviceMutation = useSyncDevice();
  const updateStatusMutation = useUpdateDeviceStatus();
  const testConnectionMutation = useTestDeviceConnection();

  // Use real data if available, fallback to mock data
  const devices = devicesData?.devices || mockDevices;
  const stats = statsData?.stats || {
    total_devices: mockDevices.length,
    online_devices: mockDevices.filter(d => d.status === "Online").length,
    offline_devices: mockDevices.filter(d => d.status === "Offline").length,
    maintenance_devices: mockDevices.filter(d => d.status === "Maintenance").length,
    total_scans_today: mockDevices.reduce((sum, d) => sum + d.total_scans, 0),
    last_sync_time: "2 min ago"
  };

  const handleSync = async (deviceId: string) => {
    try {
      await syncDeviceMutation.mutateAsync(deviceId);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleStatusUpdate = async (deviceId: string, status: 'Online' | 'Offline' | 'Maintenance') => {
    try {
      await updateStatusMutation.mutateAsync({ deviceId, status });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleTestConnection = async (deviceId: string) => {
    try {
      await testConnectionMutation.mutateAsync(deviceId);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Online': return 'badge-online';
      case 'Offline': return 'badge-offline';
      case 'Maintenance': return 'badge-warning';
      default: return 'badge-offline';
    }
  };

  const getLocationName = (location: any): string => {
    if (typeof location === 'string') {
      return location;
    }
    if (typeof location === 'object' && location !== null) {
      return location.area_name || location.area_code || 'Unknown';
    }
    return 'Unknown';
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* System Status */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">System Status</p>
              <p className="text-xs text-muted-foreground mt-0.5">Backend API and device connectivity</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnectionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : connectionError || !connectionData?.success ? (
                  <>
                    <WifiOff className="w-4 h-4 text-danger" />
                    <span className="text-sm text-danger">Backend Offline</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm text-success">Backend Online</span>
                  </>
                )}
              </div>
              <Button
                onClick={() => refetchDevices()}
                disabled={isDevicesLoading}
                variant="outline"
                size="sm"
              >
                {isDevicesLoading ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Devices", value: stats.total_devices, icon: Server, color: "bg-primary-subtle text-primary" },
            { label: "Online", value: stats.online_devices, icon: Wifi, color: "bg-success-subtle text-success" },
            { label: "Offline", value: stats.offline_devices, icon: WifiOff, color: "bg-danger-subtle text-danger" },
            { label: "Maintenance", value: stats.maintenance_devices, icon: Wrench, color: "bg-warning-subtle text-warning" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error State */}
        {devicesError && (
          <div className="stat-card">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading device data. Using mock data for demonstration.</span>
            </div>
          </div>
        )}

        {/* Device Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className="stat-card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{device.name}</p>
                    <span className={getStatusBadge(device.status)}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {device.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{device.model}</p>
                  {device.firmware_version && (
                    <p className="text-xs text-muted-foreground">v{device.firmware_version}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSync(device.id)}
                    disabled={syncDeviceMutation.isPending}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Sync device"
                  >
                    <RefreshCw className={`w-4 h-4 text-muted-foreground ${
                      syncDeviceMutation.isPending ? "animate-spin" : ""
                    }`} />
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Network className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">IP:</span>
                  <span className="font-mono text-foreground font-medium">{device.ip}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="text-foreground">{getLocationName(device.location)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Last Sync:</span>
                  <span className="text-foreground">{device.last_sync}</span>
                </div>
                {device.user_count !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Users:</span>
                    <span className="text-foreground">{device.user_count}</span>
                    {device.face_count !== undefined && (
                      <span className="text-muted-foreground">| Faces: {device.face_count}</span>
                    )}
                  </div>
                )}
                {device.sync_errors !== undefined && device.sync_errors > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                    <span className="text-muted-foreground">Sync Errors:</span>
                    <span className="text-warning font-medium">{device.sync_errors}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{device.total_scans.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Scans</p>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                    device.status === "Online" ? "bg-success-subtle" :
                    device.status === "Maintenance" ? "bg-warning-subtle" : "bg-danger-subtle"
                  }`}>
                    {device.status === "Online" ? (
                      <Wifi className="w-6 h-6 text-success" />
                    ) : device.status === "Maintenance" ? (
                      <Wrench className="w-6 h-6 text-warning" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-danger" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{device.id.replace('DEV', '')}</p>
                  <p className="text-xs text-muted-foreground">Device ID</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection(device.id)}
                  disabled={testConnectionMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {testConnectionMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Shield className="w-3 h-3 mr-1" />
                  )}
                  Test
                </Button>
                {device.status === "Offline" && (
                  <Button
                    onClick={() => handleStatusUpdate(device.id, "Online")}
                    disabled={updateStatusMutation.isPending}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Online
                  </Button>
                )}
              </div>

              {device.status === "Offline" && (
                <div className="flex items-center gap-2 bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2">
                  <WifiOff className="w-4 h-4 text-danger flex-shrink-0" />
                  <p className="text-xs text-danger font-medium">Device offline — Check network connection</p>
                </div>
              )}
              
              {device.status === "Maintenance" && (
                <div className="flex items-center gap-2 bg-warning-subtle border border-warning/20 rounded-lg px-3 py-2">
                  <Wrench className="w-4 h-4 text-warning flex-shrink-0" />
                  <p className="text-xs text-warning font-medium">Device under maintenance</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Device Overview Table */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Device Overview</p>
            <span className="text-xs text-muted-foreground">
              Last updated: {stats.last_sync_time}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Device", "Model", "IP", "Location", "Status", "Last Sync", "Scans", "Users/Faces", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-3 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 first:pl-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          d.status === 'Online' ? 'bg-success' :
                          d.status === 'Maintenance' ? 'bg-warning' : 'bg-danger'
                        }`} />
                        <span className="font-semibold text-foreground">{d.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{d.model}</td>
                    <td className="py-3 px-3 font-mono text-xs text-foreground">{d.ip}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{getLocationName(d.location)}</td>
                    <td className="py-3 px-3">
                      <span className={getStatusBadge(d.status)}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{d.last_sync}</td>
                    <td className="py-3 px-3 text-foreground font-medium text-xs">{d.total_scans.toLocaleString()}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">
                      {d.user_count !== undefined ? `${d.user_count}` : 'N/A'}
                      {d.face_count !== undefined && ` / ${d.face_count}`}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleSync(d.id)}
                        disabled={syncDeviceMutation.isPending}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors px-2 py-1 rounded"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncDeviceMutation.isPending ? "animate-spin" : ""}`} />
                        Sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}