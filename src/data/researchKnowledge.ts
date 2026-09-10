// src/data/researchKnowledge.ts
// Cơ sở tri thức tác chiến chuyên sâu của Nhóm Nghiên cứu & Vận hành 2X18 (HUS - ĐHQGHN)

export const RESEARCH_KNOWLEDGE_BASE = {
  institution: "Đại học Khoa học Tự nhiên, ĐHQGHN (HUS - VNU)",
  cohort: "2X18 Semiconductor & Materials Physics",

  // 1. KHO HỌC THUẬT CHUYÊN SÂU (ACADEMIC BLUEPRINT)
  academics: {
    boasMathMethods: {
      title: "Mary L. Boas - Mathematical Methods in the Physical Sciences",
      scope: "Phương pháp toán cho Vật lý (PHY1348)",
      keyTheories: [
        "Phương trình đạo hàm riêng (PDEs): Laplace (∇²u = 0), Truyền nhiệt (∂u/∂t = α∇²u), Sóng (∂²u/∂t² = v²∇²u). Phương pháp tách biến (Separation of Variables).",
        "Giải tích phức: Tích phân đường ∮_C f(z)dz, Định lý Cauchy-Goursat, Công thức tích phân Cauchy f(z₀) = (1/2πi) ∮ [f(z)/(z-z₀)]dz.",
        "Định lý thặng dư (Residue Theorem): ∮_C f(z)dz = 2πi ∑ Res(f, z_k). Chú ý kiểm tra điểm kỳ dị z_k nằm trong hay ngoài đường cong lấy tích phân C.",
        "Biến đổi tích phân: Chuỗi Fourier, Biến đổi Fourier F(k) = ∫ f(x)e^{-ikx}dx, Biến đổi Laplace L{f(t)} = ∫₀^∞ e^{-st}f(t)dt giải phương trình vi phân có điều kiện biên ban đầu."
      ]
    },
    griffithsElectrodynamics: {
      title: "David J. Griffiths - Introduction to Electrodynamics",
      scope: "Điện và từ học (PHY1314) & Điện động lực học (PHY3302)",
      keyTheories: [
        "Hệ phương trình Maxwell: ∇·E = ρ/ε₀, ∇·B = 0, ∇×E = -∂B/∂t, ∇×B = μ₀J + μ₀ε₀∂E/∂t.",
        "Điều kiện biên điện từ: D₁n - D₂n = σ_f, E₁t - E₂t = 0, B₁n - B₂n = 0, H₁t - H₂t = K_f × n̂.",
        "Thế vector từ A, Thế vô hướng V. Chuẩn Lorenz (∇·A + (1/c²)∂V/∂t = 0) vs Chuẩn Coulomb (∇·A = 0).",
        "Sóng điện từ trong chất dẫn: Chiết suất phức ñ = n + ik, Độ sâu suy giảm (Skin depth) δ = √(2 / (ωσμ))."
      ]
    },
    montgomeryStatisticsDOE: {
      title: "Douglas C. Montgomery - Design and Analysis of Experiments",
      scope: "Xác suất thống kê (PHY1109) & Kiểm soát quy trình thực nghiệm",
      keyTheories: [
        "Kiểm định giả thuyết: Kiểm định 1 phía (One-tailed) vs 2 phía (Two-tailed). Sai lầm loại I (bác bỏ H₀ đúng - α) và Sai lầm loại II (chấp nhận H₀ sai - β). P-value so với α = 0.05.",
        "Thiết kế thực nghiệm (DOE): Ma trận yếu tố 2^k Factorial, phân tích phương sai (ANOVA), bề mặt đáp ứng (Response Surface Methodology - RSM) để tối ưu công thức lắng đọng màng.",
        "Kiểm soát quá trình thống kê (SPC): Biểu đồ X̄-R, giới hạn kiểm soát trên (UCL) và dưới (LCL) = μ ± 3σ. Chỉ số năng lực Cp, Cpk ≥ 1.33."
      ]
    },
    szeSemiconductorDevices: {
      title: "S.M. Sze - Physics of Semiconductor Devices",
      scope: "Vật lý bán dẫn (PHY1310) & Vật liệu công nghệ bán dẫn (PHY3712)",
      keyTheories: [
        "Cấu trúc vùng năng lượng: Bandgap Eg (Direct vs Indirect), Mật độ trạng thái DOS N_c, N_v, Mức Fermi E_F.",
        "Tiếp xúc Kim loại - Bán dẫn: Rào Schottky (Schottky barrier Φ_Bn = Φ_m - χ) vs Tiếp xúc Ohmic (Ohmic contact: pha tạp cao tunneling hoặc rào thấp, điện trở tiếp xúc riêng ρ_c < 10⁻⁵ Ω·cm²).",
        "Linh kiện MOSFET/HEMT: Điện áp ngưỡng V_th, Dòng bão hòa I_D,sat, Tỉ số I_on/I_off > 10⁶, Độ hỗ dẫn g_m = ∂I_D/∂V_G, Điện áp đánh thủng V_br.",
        "Đo dung kháng C-V: Tích tụ (Accumulation), Suy giảm (Depletion), Nghịch đảo (Inversion), Mật độ bẫy mặt phân giới D_it."
      ]
    }
  },

  // 2. KHO PHÒNG SẠCH & ĐO LƯỜNG (CLEANROOM & METROLOGY HUS/NEC)
  cleanroom: {
    safetyAndCleaning: [
      "Làm sạch hóa học cơ bản: Siêu âm Acetone (5-10 phút) -> IPA (5-10 phút) -> Nước khử ion DIW -> Thổi khô bằng khí N₂ tinh khiết.",
      "Làm sạch Piranha (H₂SO₄ : H₂O₂ = 3:1): Phản ứng tỏa nhiệt cực mạnh để tẩy sạch tạp chất hữu cơ trên đế Si/Sapphire. TUYỆT ĐỐI KHÔNG để lẫn dung môi hữu cơ (Acetone) vào Piranha vì nguy cơ cháy nổ.",
      "Tẩy Oxit bằng HF loãng (1-2%): Tẩy màng native oxide SiO₂. HF cực độc, ngấm sâu qua da gây phá hủy canxi xương. BẮT BUỘC có gel Canxi Gluconate 2.5% sẵn sàng khi thao tác."
    ],
    sputteringSystem: {
      equipment: "Hệ Phún xạ Catot (DC/RF Magnetron Sputtering - Lab NEC/HUS)",
      standardRecipe: {
        baseVacuum: "< 5.0 × 10⁻⁶ Torr (Đạt độ chân không nền sâu để loại bỏ hơi nước H₂O và O₂ tự do)",
        workingGas: "Argon (Ar) 99.999% (Lưu lượng 15-30 sccm)",
        workingPressure: "3.0 - 8.0 mTorr (Áp suất làm việc tạo plasma ổn định)",
        powerSupply: "DC cho kim loại (Ti, Cu, Au, Al, Ni); RF 13.56 MHz cho vật liệu điện môi/oxit (SiO₂, Al₂O₃, ZnO, ITO)",
        depositionRate: "Tốc độ lắng đọng v = d/t (nm/phút), xác định bằng Profilometer hoặc Ellipsometry"
      },
      troubleshooting: {
        hazyFilm: "Màng bị đục/đen: Nguyên nhân do chân không nền chưa đủ sâu (nhiễm bẩn O₂/H₂O trong buồng) hoặc rò rỉ khí Ar.",
        peelingFilm: "Màng bị bong tróc (Peeling/Delamination): Ứng suất màng quá lớn do công suất/áp suất phún xạ không phù hợp, hoặc bề mặt đế chưa tẩy sạch dầu mỡ hữu cơ.",
        highResistance: "Điện trở mặt quá cao: Nồng độ khuyết tật mạng lớn, hạt tới đế có động năng thấp do công suất RF/DC quá thấp, hoặc màng bị oxy hóa ngoài ý muốn."
      }
    },
    metrologyTools: [
      "4-Point Probe (Đo 4 mũi nhọn): Điện trở mặt R_s = 4.532 × (V/I) (Ω/□). Điện trở suất ρ = R_s × t (Ω·cm).",
      "Hệ đo I-V / C-V (Keithley 2400 / 4200-SCS): Đo tiếp xúc Ohmic tuyến tính, đặc tính chỉnh lưu Diode Schottky, dòng rò I_leakage.",
      "Ellipsometry / Profilometer: Đo bề dày màng mỏng (từ vài nm đến vài μm) và chiết suất khúc xạ n, k."
    ]
  },

  // 3. THÔNG TIN HỌC BỔNG VÀ VIỆN BÁN DẪN ĐÀI LOAN (TAIWAN PIPELINE)
  taiwanPipeline: {
    nycu: {
      name: "NYCU - National Yang Ming Chiao Tung University (Đại học Quốc lập Dương Minh Giao Thông)",
      institutes: ["International College of Semiconductor Technology (ICST) - Viện Khoa học Bán dẫn Quốc tế", "Institute of Electronics"],
      researchStrengths: ["Linh kiện nano tiên tiến (GAAFET, CFET)", "Đóng gói cấp cao & Tích hợp không đồng nhất (Advanced Packaging, TSV)", "Màng mỏng 2D và Spintronics"],
      scholarships: ["NYCU Elite Scholarship (Miễn 100% học phí + trợ cấp hàng tháng 15,000 - 25,000 NTD)", "MOE Taiwan Scholarship"],
      criteria: "GPA ≥ 3.4/4.0 (lý tưởng ≥ 3.6), IELTS ≥ 6.5, kinh nghiệm thực hành phòng sạch (Cleanroom logbook) và bài báo khoa học là lợi thế vượt trội."
    },
    nthu: {
      name: "NTHU - National Tsing Hua University (Đại học Quốc lập Thanh Hoa)",
      institutes: ["College of Semiconductor Research (CoSR) - Viện Bán dẫn do TSMC đồng sáng lập"],
      researchStrengths: ["Bán dẫn công suất thế hệ 3/4 (GaN, SiC, Ga₂O₃)", "Công nghệ màng mỏng ALD và epitaxy"],
      scholarships: ["NTHU International Student Scholarship (Miễn học phí + 10,000 - 20,000 NTD/tháng)"]
    },
    ntu: {
      name: "NTU - National Taiwan University (Đại học Quốc lập Đài Loan)",
      institutes: ["Graduate School of Advanced Technology (GSAT)"],
      researchStrengths: ["Thiết kế vi mạch tích hợp (IC Design)", "Vật liệu & Linh kiện bán dẫn thế hệ tiếp theo"]
    },
    tsri: {
      name: "TSRI - Taiwan Semiconductor Research Institute",
      role: "Trung tâm Nghiên cứu & Chế tạo Bán dẫn trọng điểm quốc gia của Đài Loan, hỗ trợ sinh viên sau đại học chế tạo chip thử nghiệm (Tape-out) và đo kiểm chuyên sâu."
    }
  },

  // 4. MA TRẬN NHÂN SỰ & CHUYÊN MÔN 16 THÀNH VIÊN 2X18
  teamMatrix: {
    total: 16,
    core: {
      hung: { name: "Hưng", role: "Team Leader / Architecture", focus: "Kiến trúc hệ thống, điều phối luồng nghiên cứu, quản trị tiến độ và chiến lược học bổng tinh hoa Đài Loan." },
      long: { name: "Long", role: "Core - Theory & Simulation", focus: "Toán lý chuyên sâu (Boas PDEs, Fourier-Laplace), mô phỏng số và cơ chế lượng tử." },
      ngoc: { name: "Ngọc", role: "Core - Cleanroom Operations", focus: "Chủ trì quy trình phòng sạch NEC/HUS, công thức lắng đọng Sputtering/ALD, an toàn hóa chất." },
      phuc: { name: "Phúc", role: "Core - Metrology & Characterization", focus: "Đo kiểm linh kiện (4-Point Probe, Keithley I-V/C-V), thống kê thực nghiệm SPC và DOE." },
      do: { name: "Độ", role: "Core - Materials & Semiconductor Physics", focus: "Vật lý bán dẫn (Sze), cấu trúc màng mỏng, Spintronics và cơ chế vi mô First Principles." }
    },
    membersCount: 11,
    membersMission: "Xây dựng nền tảng học thuật vững chắc (GPA ≥ 3.2), thuần thục phân tích dữ liệu thực nghiệm bằng Python, giải phẫu bài báo khoa học và tích lũy chứng chỉ ngoại ngữ (IELTS ≥ 6.5 / TOCFL B1-B2)."
  }
};
