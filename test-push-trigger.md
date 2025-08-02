# Test Push Trigger

This file is created to test if pushing to blog-content repository triggers the blog-system deployment.

Test timestamp: 2025-08-02

Expected behavior:
1. Push to blog-content triggers trigger-build.yml
2. trigger-build.yml sends repository_dispatch to blog-system  
3. blog-system receives repository_dispatch and runs build-and-deploy.yml
4. build-and-deploy.yml syncs content and deploys to Cloudflare Pages