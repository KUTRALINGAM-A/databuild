from fpdf import FPDF
import random

def create_energy_bill():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="India Power Supply Co. - Monthly Energy Bill", ln=True, align='C')
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Customer: Apex Manufacturing Ltd.", ln=True)
    pdf.cell(200, 10, txt="Billing Period: March 2026", ln=True)
    pdf.cell(200, 10, txt="Meter Number: 8492021", ln=True)
    pdf.ln(10)
    
    kwh = random.randint(120000, 150000)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt=f"Total Consumption: {kwh} KWh", ln=True)
    
    pdf.set_font("Arial", size=10)
    pdf.ln(20)
    pdf.cell(200, 10, txt="Remarks: Payment due within 15 days.", ln=True)
    pdf.output("dummy_energy_bill.pdf")

def create_shipping_log():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="Global Freight Logistics - Monthly Cargo Transport Log", ln=True, align='C')
    pdf.ln(10)
    
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Client: Apex Manufacturing Ltd.", ln=True)
    pdf.cell(200, 10, txt="Log Period: March 2026", ln=True)
    pdf.ln(10)
    
    litres = random.randint(4000, 8000)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt=f"Total Diesel Consumption: {litres} Litres", ln=True)
    
    pdf.set_font("Arial", size=10)
    pdf.ln(20)
    pdf.cell(200, 10, txt="Log covers 14 distinct cargo trips across state lines.", ln=True)
    pdf.output("dummy_transport_log.pdf")

print("Generating PDFs...")
create_energy_bill()
create_shipping_log()
print("Done! Files saved as dummy_energy_bill.pdf and dummy_transport_log.pdf")
