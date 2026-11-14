import { script } from "raea/brief";

export default script({
  title: "Kenapa langit berwarna biru?",
  logline: "Cahaya Matahari putih; udara menghamburkan birunya ke segala arah.",
  scenes: [
    {
      heading: "Bumi dari luar angkasa",
      payoff: "Penonton memegang pertanyaannya: dari mana warna biru itu?",
      beats: [
        { onScreen: "Bumi, sisi siang diterangi Matahari dari kiri, tepi atmosfer biru", camera: "whip masuk lalu melayang pelan, tidak berhenti", cut: "buka dari hitam", seconds: 2.5,
          lines: [{ who: "narrator", says: "Kenapa langit berwarna biru?" }], cues: ["bed masuk pelan"] },
        { onScreen: "Panel kaca: Cahaya Matahari terlihat putih. Jadi dari mana warna birunya?", seconds: 3.5, onWord: "putih",
          lines: [{ who: "narrator", says: "Cahaya Matahari terlihat putih. Jadi dari mana warna birunya?", how: "tenang" }] },
      ],
    },
  ],
});
