/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
    use: {
        browserName: "chromium",
        headless: true,
    },
    testDir: "./e2e",
}
