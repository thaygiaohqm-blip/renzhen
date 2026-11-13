/* Super Cihui — danh mục cấp độ và từ loại (HSK 3.0, tiêu chuẩn GF 0025—2021). */
window.MD_CATALOG = {
  total: 11092,
  industriesReady: false,
  books: [],
  industries: [],
  levels: [
    { id: "h1", name: "HSK 1", target: 500, ready: true, blurb: "Sơ cấp: chào hỏi, số, gia đình, ăn uống, thời gian và những động từ dùng mỗi ngày." },
    { id: "h2", name: "HSK 2", target: 772, ready: true, blurb: "Sơ cấp: mua sắm, đi lại, thời tiết, sức khỏe và các tình huống đời thường." },
    { id: "h3", name: "HSK 3", target: 973, ready: true, blurb: "Sơ cấp: học tập, công việc, sở thích, kể chuyện và diễn đạt ý kiến đơn giản." },
    { id: "h4", name: "HSK 4", target: 1000, ready: true, blurb: "Trung cấp: trao đổi về xã hội, văn hóa, du lịch và công việc." },
    { id: "h5", name: "HSK 5", target: 1071, ready: true, blurb: "Trung cấp: đọc báo, thảo luận chủ đề trừu tượng, từ vựng trang trọng." },
    { id: "h6", name: "HSK 6", target: 1140, ready: true, blurb: "Trung cấp: diễn đạt chính xác, nhiều từ ghép và cách nói thành ngữ." },
    { id: "h7", name: "HSK 7–9", target: 5636, ready: true, blurb: "Cao cấp: học thuật, chuyên ngành, văn viết và từ vựng hiếm." }
  ],
  pos: [
    { id: "n", label: "Danh từ", ja: "名词[míng cí]" },
    { id: "v", label: "Động từ", ja: "动词[dòng cí]" },
    { id: "adj", label: "Tính từ", ja: "形容词[xíng róng cí]" },
    { id: "adv", label: "Phó từ", ja: "副词[fù cí]" },
    { id: "pron", label: "Đại từ", ja: "代词[dài cí]" },
    { id: "ctr", label: "Số từ và lượng từ", ja: "数词[shù cí]・量词[liàng cí]", codes: ["num", "m"] },
    { id: "conj", label: "Liên từ và giới từ", ja: "连词[lián cí]・介词[jiè cí]", codes: ["conj", "prep"] },
    { id: "aux", label: "Trợ từ và thán từ", ja: "助词[zhù cí]・叹词[tàn cí]", codes: ["aux", "intj", "phonetic"] },
    { id: "affix", label: "Tiền tố và hậu tố", ja: "词缀[cí zhuì]", codes: ["prefix", "suffix"] },
    { id: "exp", label: "Cụm cố định và khác", ja: "固定短语[gù dìng duǎn yǔ]" }
  ],
  posName: {
    n: "Danh từ", v: "Động từ", adj: "Tính từ", adv: "Phó từ", pron: "Đại từ", num: "Số từ", m: "Lượng từ",
    conj: "Liên từ", prep: "Giới từ", aux: "Trợ từ", intj: "Thán từ", prefix: "Tiền tố", suffix: "Hậu tố",
    phonetic: "Từ tượng thanh", exp: "Cụm cố định"
  }
};
