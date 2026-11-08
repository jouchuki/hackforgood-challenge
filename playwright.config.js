import {defineConfig} from '@playwright/test';
import {existsSync}from'node:fs';
export default defineConfig({testDir:'./qa',timeout:45000,fullyParallel:false,workers:1,reporter:'list',use:{baseURL:'http://localhost:3000',headless:true,viewport:{width:1440,height:1000},launchOptions:{...(existsSync('/usr/bin/google-chrome')?{executablePath:'/usr/bin/google-chrome'}:{}),args:['--no-sandbox']},screenshot:'only-on-failure',trace:'retain-on-failure'}});
