/**
 * VFS Templates - Scenario-specific filesystem configurations
 * Provides realistic filesystem content for different KRITIS scenarios
 */

import { VirtualFilesystem } from './VirtualFilesystem';

// ============================================================================
// Template Types
// ============================================================================

export interface VFSTemplate {
  name: string;
  description: string;
  directories: string[];
  files: { path: string; content: string }[];
}

// ============================================================================
// Linux Server Templates
// ============================================================================

export const linuxWebServerTemplate: VFSTemplate = {
  name: 'Linux Web Server',
  description: 'Apache/Nginx web server with typical configuration',
  directories: [
    '/var/www/html',
    '/var/www/html/css',
    '/var/www/html/js',
    '/var/www/html/api',
    '/etc/apache2/sites-available',
    '/etc/apache2/sites-enabled',
    '/etc/nginx/sites-available',
    '/etc/nginx/sites-enabled',
    '/etc/ssl/certs',
    '/etc/ssl/private',
    '/var/log/nginx',
  ],
  files: [
    {
      path: '/etc/apache2/apache2.conf',
      content: `# Apache2 main configuration
ServerRoot "/etc/apache2"
Mutex file:\${APACHE_LOCK_DIR} default
PidFile \${APACHE_PID_FILE}
Timeout 300
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5

# Security settings
ServerTokens Prod
ServerSignature Off
TraceEnable Off

# Include module configuration
IncludeOptional mods-enabled/*.load
IncludeOptional mods-enabled/*.conf
IncludeOptional sites-enabled/*.conf`,
    },
    {
      path: '/etc/apache2/sites-available/000-default.conf',
      content: `<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>`,
    },
    {
      path: '/var/www/html/index.html',
      content: `<!DOCTYPE html>
<html>
<head><title>Stadtwerke Portal</title></head>
<body>
<h1>Willkommen beim Stadtwerke Kundenportal</h1>
<p>Bitte melden Sie sich an, um fortzufahren.</p>
</body>
</html>`,
    },
    {
      path: '/etc/nginx/nginx.conf',
      content: `user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    include /etc/nginx/sites-enabled/*;
}`,
    },
  ],
};

export const linuxDatabaseServerTemplate: VFSTemplate = {
  name: 'Linux Database Server',
  description: 'MySQL/PostgreSQL database server',
  directories: [
    '/etc/mysql',
    '/etc/mysql/conf.d',
    '/etc/postgresql/14/main',
    '/var/lib/mysql',
    '/var/lib/postgresql',
    '/var/log/mysql',
    '/var/log/postgresql',
    '/var/backups/mysql',
  ],
  files: [
    {
      path: '/etc/mysql/my.cnf',
      content: `[mysqld]
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
bind-address=127.0.0.1
port=3306

# Security
local-infile=0
skip-symbolic-links

# Logging
log_error=/var/log/mysql/error.log
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

# Performance
max_connections=150
innodb_buffer_pool_size=256M`,
    },
    {
      path: '/etc/postgresql/14/main/postgresql.conf',
      content: `# PostgreSQL configuration
data_directory = '/var/lib/postgresql/14/main'
listen_addresses = 'localhost'
port = 5432
max_connections = 100

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'ddl'`,
    },
    {
      path: '/var/log/mysql/error.log',
      content: `2026-03-14T08:00:00.123456Z 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.0.32) starting
2026-03-14T08:00:01.234567Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections.
2026-03-14T09:15:00.345678Z 3 [Warning] [MY-010055] [Server] IP address '192.168.1.100' has been resolved to the host name 'workstation01.local'
2026-03-14T10:00:00.456789Z 5 [Warning] [MY-010058] [Server] Access denied for user 'backup'@'192.168.1.50' (using password: YES)`,
    },
  ],
};

export const linuxMailServerTemplate: VFSTemplate = {
  name: 'Linux Mail Server',
  description: 'Postfix/Dovecot mail server',
  directories: [
    '/etc/postfix',
    '/etc/dovecot',
    '/etc/dovecot/conf.d',
    '/var/mail',
    '/var/spool/postfix',
    '/var/log/mail',
  ],
  files: [
    {
      path: '/etc/postfix/main.cf',
      content: `# Postfix main configuration
smtpd_banner = $myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no

# TLS parameters
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls=yes
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache

# Network
myhostname = mail.stadtwerke.local
mydomain = stadtwerke.local
myorigin = $mydomain
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 192.168.1.0/24

# Security
smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination`,
    },
    {
      path: '/var/log/mail/mail.log',
      content: `Mar 14 08:00:00 mail postfix/postfix-script[1234]: starting the Postfix mail system
Mar 14 08:00:01 mail postfix/master[1235]: daemon started
Mar 14 09:30:00 mail postfix/smtpd[2345]: connect from unknown[203.0.113.42]
Mar 14 09:30:01 mail postfix/smtpd[2345]: NOQUEUE: reject: RCPT from unknown[203.0.113.42]: 554 5.7.1 <admin@stadtwerke.local>: Relay access denied
Mar 14 09:30:02 mail postfix/smtpd[2345]: disconnect from unknown[203.0.113.42]
Mar 14 10:00:00 mail dovecot: imap-login: Login: user=<mueller>, method=PLAIN, rip=192.168.1.50, lip=192.168.1.10`,
    },
  ],
};

export const linuxFirewallTemplate: VFSTemplate = {
  name: 'Linux Firewall/Router',
  description: 'iptables/nftables firewall configuration',
  directories: [
    '/etc/iptables',
    '/etc/nftables',
    '/etc/fail2ban',
    '/etc/fail2ban/jail.d',
    '/var/log/fail2ban',
  ],
  files: [
    {
      path: '/etc/iptables/rules.v4',
      content: `*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow loopback
-A INPUT -i lo -j ACCEPT
-A OUTPUT -o lo -j ACCEPT

# Allow established connections
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH from management network
-A INPUT -p tcp -s 192.168.1.0/24 --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT

# Allow ICMP (ping)
-A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Log and drop everything else
-A INPUT -j LOG --log-prefix "IPTables-Dropped: " --log-level 4
-A INPUT -j DROP

COMMIT`,
    },
    {
      path: '/etc/fail2ban/jail.local',
      content: `[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = auto

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[apache-auth]
enabled = true
port = http,https
filter = apache-auth
logpath = /var/log/apache2/*error.log`,
    },
    {
      path: '/var/log/fail2ban/fail2ban.log',
      content: `2026-03-14 08:00:00,123 fail2ban.server         [1234]: INFO    Starting Fail2ban
2026-03-14 08:00:01,234 fail2ban.jail           [1234]: INFO    Jail 'sshd' started
2026-03-14 09:15:00,345 fail2ban.filter         [1234]: INFO    [sshd] Found 203.0.113.42 - 2026-03-14 09:15:00
2026-03-14 09:15:30,456 fail2ban.filter         [1234]: INFO    [sshd] Found 203.0.113.42 - 2026-03-14 09:15:30
2026-03-14 09:16:00,567 fail2ban.filter         [1234]: INFO    [sshd] Found 203.0.113.42 - 2026-03-14 09:16:00
2026-03-14 09:16:01,678 fail2ban.actions        [1234]: NOTICE  [sshd] Ban 203.0.113.42`,
    },
  ],
};

// ============================================================================
// Windows Templates
// ============================================================================

export const windowsDomainControllerTemplate: VFSTemplate = {
  name: 'Windows Domain Controller',
  description: 'Active Directory domain controller',
  directories: [
    'C:\\Windows\\NTDS',
    'C:\\Windows\\SYSVOL',
    'C:\\Windows\\System32\\GroupPolicy',
    'C:\\Windows\\System32\\LogFiles',
    'C:\\Logs\\Security',
  ],
  files: [
    {
      path: 'C:\\Windows\\System32\\LogFiles\\ADDS.log',
      content: `[2026-03-14 08:00:00] Active Directory Domain Services started
[2026-03-14 08:00:01] LDAP interface initialized on port 389
[2026-03-14 08:00:02] Global Catalog initialized on port 3268
[2026-03-14 09:30:00] Authentication request from WORKSTATION01 for user admin.mueller
[2026-03-14 09:30:01] Successful authentication for admin.mueller
[2026-03-14 10:00:00] Failed authentication attempt for user 'administrator' from 10.0.0.50
[2026-03-14 10:00:05] Account lockout: administrator (5 failed attempts)`,
    },
    {
      path: 'C:\\Logs\\Security\\EventLog.txt',
      content: `Event ID: 4624 - Successful logon
Account: STADTWERKE\\admin.mueller
Logon Type: 10 (Remote Interactive)
Source: 192.168.1.50
Time: 2026-03-14 09:30:00

Event ID: 4625 - Failed logon
Account: administrator
Logon Type: 3 (Network)
Source: 10.0.0.50
Time: 2026-03-14 10:00:00
Failure Reason: Unknown user name or bad password

Event ID: 4740 - Account lockout
Account: administrator
Caller Computer: DC01
Time: 2026-03-14 10:00:05`,
    },
  ],
};

export const windowsFileServerTemplate: VFSTemplate = {
  name: 'Windows File Server',
  description: 'SMB file server with shares',
  directories: [
    'C:\\Shares\\Public',
    'C:\\Shares\\Finance',
    'C:\\Shares\\HR',
    'C:\\Shares\\IT',
    'C:\\Logs\\SMB',
  ],
  files: [
    {
      path: 'C:\\Shares\\Public\\Willkommen.txt',
      content: `Willkommen auf dem Stadtwerke Dateiserver!

Bitte beachten Sie die Datenschutzrichtlinien.
Bei Fragen wenden Sie sich an die IT-Abteilung.

IT-Support: support@stadtwerke.local
Telefon: 0800-SUPPORT`,
    },
    {
      path: 'C:\\Shares\\IT\\Netzwerk-Dokumentation.txt',
      content: `Netzwerk-Dokumentation (VERTRAULICH)
=====================================

Subnetze:
- 192.168.1.0/24  - Management
- 192.168.10.0/24 - Server
- 192.168.20.0/24 - Clients
- 10.0.0.0/24     - SCADA (isoliert)

Wichtige Server:
- DC01: 192.168.10.1 (Domain Controller)
- FS01: 192.168.10.2 (File Server)
- DB01: 192.168.10.3 (Database)
- SCADA01: 10.0.0.1 (SCADA Master)`,
    },
    {
      path: 'C:\\Logs\\SMB\\access.log',
      content: `2026-03-14 09:00:00 CONNECT STADTWERKE\\admin.mueller \\\\FS01\\IT$ SUCCESS
2026-03-14 09:15:00 READ STADTWERKE\\admin.mueller \\\\FS01\\IT$\\Netzwerk-Dokumentation.txt
2026-03-14 09:30:00 CONNECT STADTWERKE\\praktikant01 \\\\FS01\\Finance$ ACCESS_DENIED
2026-03-14 10:00:00 WRITE STADTWERKE\\buchhalter01 \\\\FS01\\Finance$\\Quartalsabschluss.xlsx`,
    },
  ],
};

// ============================================================================
// KRITIS-specific Templates
// ============================================================================

export const scadaSystemTemplate: VFSTemplate = {
  name: 'SCADA System',
  description: 'Industrial control system (Linux-based)',
  directories: [
    '/opt/scada',
    '/opt/scada/config',
    '/opt/scada/logs',
    '/opt/scada/data',
    '/var/log/scada',
    '/etc/modbus',
  ],
  files: [
    {
      path: '/opt/scada/config/system.conf',
      content: `# SCADA System Configuration
# ACHTUNG: Änderungen nur durch autorisiertes Personal!

[system]
name = Wasserwerk_Nord
version = 4.2.1
mode = production

[network]
plc_network = 10.0.0.0/24
hmi_address = 10.0.0.100
modbus_port = 502
opc_port = 4840

[security]
auth_required = true
encryption = none  # TODO: Enable TLS
session_timeout = 3600

[logging]
level = INFO
path = /var/log/scada
retention_days = 90`,
    },
    {
      path: '/var/log/scada/operations.log',
      content: `2026-03-14 06:00:00 [INFO] System startup complete
2026-03-14 06:00:01 [INFO] Connected to PLC01 at 10.0.0.10
2026-03-14 06:00:02 [INFO] Connected to PLC02 at 10.0.0.11
2026-03-14 08:00:00 [INFO] Operator login: technik01 from 10.0.0.100
2026-03-14 08:30:00 [INFO] Setpoint change: Pump_01 speed 75% -> 80%
2026-03-14 09:00:00 [WARN] Communication timeout with PLC03 at 10.0.0.12
2026-03-14 09:00:05 [INFO] PLC03 reconnected
2026-03-14 10:00:00 [WARN] Unauthorized access attempt from 192.168.1.50`,
    },
    {
      path: '/opt/scada/config/plc_config.json',
      content: `{
  "plc_devices": [
    {"id": "PLC01", "ip": "10.0.0.10", "type": "S7-1200", "function": "Pumpensteuerung"},
    {"id": "PLC02", "ip": "10.0.0.11", "type": "S7-1200", "function": "Ventilsteuerung"},
    {"id": "PLC03", "ip": "10.0.0.12", "type": "S7-300", "function": "Sensorik"}
  ],
  "polling_interval_ms": 100,
  "timeout_ms": 5000
}`,
    },
    {
      path: '/etc/modbus/modbus.conf',
      content: `# Modbus TCP Configuration
[server]
port = 502
max_connections = 10
timeout = 30

[registers]
# Holding registers (read/write)
pump_speed = 40001
valve_position = 40002
setpoint_pressure = 40003

# Input registers (read only)
actual_pressure = 30001
flow_rate = 30002
temperature = 30003`,
    },
  ],
};

export const networkMonitoringTemplate: VFSTemplate = {
  name: 'Network Monitoring',
  description: 'Network monitoring and logging system',
  directories: [
    '/opt/monitoring',
    '/opt/monitoring/config',
    '/var/log/monitoring',
    '/var/log/snmp',
    '/etc/snmp',
  ],
  files: [
    {
      path: '/opt/monitoring/config/hosts.conf',
      content: `# Monitored Hosts Configuration

define host {
    host_name       fw01
    alias           Hauptfirewall
    address         192.168.1.1
    check_command   check-host-alive
    check_interval  1
}

define host {
    host_name       dc01
    alias           Domain Controller
    address         192.168.10.1
    check_command   check-host-alive
    parents         fw01
}

define host {
    host_name       scada01
    alias           SCADA Master
    address         10.0.0.1
    check_command   check-host-alive
    check_interval  0.5
    notification_interval 1
}`,
    },
    {
      path: '/var/log/monitoring/alerts.log',
      content: `2026-03-14 06:00:00 [OK] All systems operational
2026-03-14 08:15:00 [WARN] High CPU usage on DB01 (85%)
2026-03-14 08:30:00 [OK] CPU usage on DB01 normalized (45%)
2026-03-14 09:00:00 [CRIT] Connection lost to SCADA01
2026-03-14 09:00:15 [OK] Connection restored to SCADA01
2026-03-14 09:45:00 [WARN] Unusual traffic pattern detected on VLAN 10
2026-03-14 10:00:00 [WARN] Multiple failed SSH attempts to FW01 from 203.0.113.42`,
    },
    {
      path: '/var/log/snmp/traps.log',
      content: `2026-03-14 08:00:00 TRAP from 192.168.1.1: linkUp interface eth0
2026-03-14 08:15:00 TRAP from 192.168.10.3: cpuUsageHigh threshold=80 current=85
2026-03-14 09:00:00 TRAP from 10.0.0.1: communicationFailure target=10.0.0.12
2026-03-14 09:45:00 TRAP from 192.168.1.1: securityAlert type=portScan source=203.0.113.42`,
    },
  ],
};

// ============================================================================
// Template Application Functions
// ============================================================================

/**
 * Apply a template to an existing VirtualFilesystem
 */
export function applyTemplate(vfs: VirtualFilesystem, template: VFSTemplate): void {
  // Create directories
  for (const dir of template.directories) {
    vfs.addDirectory(dir);
  }

  // Create files
  for (const file of template.files) {
    vfs.addFile(file.path, file.content);
  }
}

/**
 * Apply multiple templates to a VirtualFilesystem
 */
export function applyTemplates(vfs: VirtualFilesystem, templates: VFSTemplate[]): void {
  for (const template of templates) {
    applyTemplate(vfs, template);
  }
}

/**
 * Get all available templates
 */
export function getAllTemplates(): VFSTemplate[] {
  return [
    linuxWebServerTemplate,
    linuxDatabaseServerTemplate,
    linuxMailServerTemplate,
    linuxFirewallTemplate,
    windowsDomainControllerTemplate,
    windowsFileServerTemplate,
    scadaSystemTemplate,
    networkMonitoringTemplate,
  ];
}

/**
 * Get templates by type
 */
export function getLinuxTemplates(): VFSTemplate[] {
  return [
    linuxWebServerTemplate,
    linuxDatabaseServerTemplate,
    linuxMailServerTemplate,
    linuxFirewallTemplate,
    scadaSystemTemplate,
    networkMonitoringTemplate,
  ];
}

export function getWindowsTemplates(): VFSTemplate[] {
  return [
    windowsDomainControllerTemplate,
    windowsFileServerTemplate,
  ];
}

export function getKritisTemplates(): VFSTemplate[] {
  return [
    scadaSystemTemplate,
    networkMonitoringTemplate,
  ];
}

/**
 * Template ID to template mapping
 */
const templateRegistry: Record<string, VFSTemplate> = {
  'linux-webserver': linuxWebServerTemplate,
  'linux-database': linuxDatabaseServerTemplate,
  'linux-mail': linuxMailServerTemplate,
  'linux-firewall': linuxFirewallTemplate,
  'windows-dc': windowsDomainControllerTemplate,
  'windows-fileserver': windowsFileServerTemplate,
  'scada': scadaSystemTemplate,
  'monitoring': networkMonitoringTemplate,
};

/**
 * Get a template by its ID
 */
export function getTemplateById(id: string): VFSTemplate | undefined {
  return templateRegistry[id];
}

/**
 * Resolve multiple template IDs to templates
 */
export function resolveTemplateIds(ids: string[]): VFSTemplate[] {
  return ids
    .map(id => templateRegistry[id])
    .filter((t): t is VFSTemplate => t !== undefined);
}
