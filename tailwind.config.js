/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#fdfefe',
        backgroundDark: '#373737',
        backgroundLight: '#f9f9f9',
        textPrimary: '#373737',
        textSecondary: '#666666',
        textMuted: '#999999',
        actionPrimary: '#ee4e43',
        actionPrimaryLight: '#f47b73',
        actionPrimaryDark: '#cb3a31',
        border: '#e0e0e0',
        borderLight: '#f0f0f0',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
      }
    },
  },
  plugins: [],
};
