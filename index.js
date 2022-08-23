#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import unixify from 'unixify';

import { readPackageUpSync } from 'read-pkg-up';

const cwd = unixify( process.cwd() );

const freemisDeployer = () {
  console.log('Deploying...');

}

freemisDeployer();
