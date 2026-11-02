#!/usr/bin/env bun
import process from 'node:process'
import { runCli } from './cli/run'

void runCli(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
