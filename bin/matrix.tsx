#!/usr/bin/env bun
import { render } from "ink";
import App from "../lib/matrix/app.js";
import { parseConfig } from "../lib/matrix/config.js";

const config = parseConfig();
render(<App config={config} />);
