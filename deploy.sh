#!/bin/bash
cd /var/www/sunmap
git -c safe.directory=/var/www/sunmap pull origin main
npm run build
echo "Deploy completed at $(date)"
