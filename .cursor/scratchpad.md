# SunMap & YouUp Server Management

## Background and Motivation

### Completed Deployments
- ✅ **SunMap** (sunmap.dwings.app) - Interactive US sunset map
- ✅ **YouUp** (youup.dwings.app) - Server status dashboard

### Architecture
```
Internet → Cloudflare Tunnel → Ubuntu Server
                                ├── Caddy :8080 → /var/www/sunmap/dist (static)
                                └── Caddy :8081 → localhost:3001 (Node.js YouUp)
```

---

## 🚨 Pre-Trip Server Hardening Plan

**Goal:** Ensure server stays healthy for 1 month unattended

### Task 1: External Uptime Monitoring (FREE)
Set up UptimeRobot or Cronitor to ping your sites every 5 minutes and email/SMS you if they go down.
- [ ] Sign up at uptimerobot.com (free tier: 50 monitors)
- [ ] Add monitor for https://sunmap.dwings.app
- [ ] Add monitor for https://youup.dwings.app
- [ ] Configure email/SMS alerts
- **Success criteria:** Receive test alert, then receive "up" confirmation
- **Time estimate:** 10 minutes

### Task 2: Enable Automatic Security Updates
Ubuntu can auto-install security patches so you don't get hacked while away.
- [ ] Install unattended-upgrades: `sudo apt install unattended-upgrades`
- [ ] Enable it: `sudo dpkg-reconfigure -plow unattended-upgrades`
- [ ] Verify: `cat /etc/apt/apt.conf.d/20auto-upgrades`
- **Success criteria:** File shows `APT::Periodic::Unattended-Upgrade "1";`
- **Time estimate:** 5 minutes

### Task 3: Verify Service Auto-Restart Policies
Confirm all services will restart if they crash or if the server reboots.
- [ ] Check youup service: `systemctl show youup | grep Restart`
- [ ] Check caddy service: `systemctl show caddy | grep Restart`
- [ ] Check cloudflared service: `systemctl show cloudflared | grep Restart`
- [ ] Test with reboot: `sudo reboot` then verify all services come back
- **Success criteria:** All services show `Restart=always` or `on-failure`, and survive reboot
- **Time estimate:** 10 minutes

### Task 4: Set Up Disk Space Alert
Prevent disk from filling up and crashing services.
- [ ] Check current usage: `df -h /`
- [ ] Add cron job to email if disk > 80%
- [ ] Or: set up logrotate for any growing logs
- **Success criteria:** Alert mechanism in place
- **Time estimate:** 15 minutes

### Task 5: Document Recovery Procedures
Write down how to fix common issues so you (or someone else) can recover remotely.
- [ ] SSH command to access server
- [ ] Commands to restart services
- [ ] Commands to check logs
- [ ] Emergency contacts / escalation plan
- **Success criteria:** README with all recovery commands
- **Time estimate:** 15 minutes

---

## 🔍 Investigation: Time Offset ±106 Minutes Issue (Dec 19 2026)

### Background
User noticed that on December 19, 2026, the legend shows a range of -106 to +106 minutes which feels too wide. They suspected Alaska and Hawaii might be excluded from display but not from the average calculations.

### Key Finding: US Territories NOT Being Excluded

**Root Cause:** The exclusion list in `src/lib/map.ts` only excludes:
- `02` (Alaska)
- `15` (Hawaii)
- `72` (Puerto Rico)

But the us-atlas dataset includes OTHER US territories that are NOT being excluded:
- **`60` (American Samoa)** - Has a county "Manu'a" with timezone `Pacific/Pago_Pago`, sunset at 18:45 (+106 min delta!)
- **`66` (Guam)** - Timezone `Pacific/Guam`, sunset at 17:59 (+60 min delta)
- **`69` (Northern Mariana Islands)** - Timezone `Pacific/Saipan` (+56 min delta)
- **`78` (US Virgin Islands)** - Using `America/St_Thomas` timezone

### Evidence from Investigation Script
```
=== Top 10 LATEST sunsets (most positive delta) ===
  Manu'a, State 60: 18:45 (+106 min) [Pacific/Pago_Pago]   <-- AMERICAN SAMOA!
  Presidio, Texas: 18:01 (+62 min) [America/Chicago]
  Guam, State 66: 17:59 (+60 min) [Pacific/Guam]           <-- GUAM!
  ...
```

**Without territories:** The contiguous US range would be approximately -70 to +62 minutes (more reasonable).

### Proposed Fix
Update `EXCLUDED_STATE_FIPS` in `src/lib/map.ts` to include all non-contiguous territories:

```typescript
const EXCLUDED_STATE_FIPS = new Set([
  '02', // Alaska
  '15', // Hawaii  
  '60', // American Samoa
  '66', // Guam
  '69', // Northern Mariana Islands
  '72', // Puerto Rico
  '78', // US Virgin Islands
]);
```

---

## Project Status Board

### Completed
- [x] SunMap app implementation (county-level)
- [x] Deploy SunMap to sunmap.dwings.app
- [x] YouUp server dashboard implementation
- [x] Deploy YouUp to youup.dwings.app
- [x] Fix port conflict (YouUp on 3001, Caddy proxies 8081→3001)

### Pre-Trip Hardening
- [ ] Task 1: External uptime monitoring
- [ ] Task 2: Automatic security updates
- [ ] Task 3: Verify service restart policies
- [ ] Task 4: Disk space monitoring
- [ ] Task 5: Document recovery procedures

---

## Lessons

1. Cloudflare Tunnel eliminates need for port forwarding and static IP
2. Caddy is simpler than nginx for serving static files
3. Always set up services to persist across reboots
4. Systemd `Environment=` variables override code defaults
5. When using reverse_proxy in Caddy, the backend app must run on a DIFFERENT port than Caddy listens on
6. SSH keys are required for cloning private GitHub repos on servers
7. Always verify service status with `systemctl status` after changes
