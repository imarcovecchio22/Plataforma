module.exports = {
  plugins: {
    // Antes que Tailwind: mete el tema del cliente dentro de globals.css (así sus @layer funcionan)
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
