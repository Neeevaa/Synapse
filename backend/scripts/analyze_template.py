with open(r"C:\Users\Neeva\.gemini\antigravity-ide\brain\6002dc63-1243-4f35-927c-cef3e3be103a\scratch\template_code.js", encoding="utf-8") as f:
    code = f.read()

pos_dev = code.find('mfl-device-svg')
if pos_dev != -1:
    print("--- DEVICE SVG ---")
    print(code[pos_dev-100:pos_dev+1800])

pos_satin = code.find('mfl-satin')
if pos_satin != -1:
    print("\n--- SATIN SVG ---")
    print(code[pos_satin-100:pos_satin+1500])
