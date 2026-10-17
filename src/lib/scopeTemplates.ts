// ---------------------------------------------------------------------------
// Scope Templates
// Maps each scope name to the exact product names from the catalog.
// Products are looked up by exact name match (case-insensitive) in the DB.
// Add more scopes here as you go through each Excel sheet.
// ---------------------------------------------------------------------------

export interface TemplateItem {
  productName: string;   // exact name to look up in Product table
  defaultQty: number;    // starting quantity (rep will adjust)
  isLabor?: boolean;     // if true, treated as labor line
}

export const SCOPE_TEMPLATES: Record<string, TemplateItem[]> = {

  // ---- INTERIOR ----------------------------------------------------------

  "Wall Assembly": [
    { productName: '2"x4"x8\' Common Framing', defaultQty: 1 },
    { productName: '2"x4"x16\' Common Framing', defaultQty: 1 },
    { productName: '2"x4"x16\' PT Green', defaultQty: 1 },
    { productName: '2"x6"x8\' Common Framing', defaultQty: 1 },
    { productName: '2"x6"x16\' PT Green', defaultQty: 1 },
    { productName: '2"x12"x10\' Common Framing', defaultQty: 1 },
  ],

  "Wall Accessories": [
    { productName: 'Paslode 2-3/8" Framing Nails', defaultQty: 1 },
    { productName: 'MiTek 5"x1-9/16" Steel Single Stud Shoe', defaultQty: 1 },
    { productName: '1-1/2"x3" Self Nailing Pipe Stud Guard', defaultQty: 1 },
    { productName: 'Red Head 1/4"x2-1/4" Hex Nut Expansion Wedge 25 Count', defaultQty: 1 },
  ],

  "Insulation": [
    { productName: 'R-19 Kraft Faced Fiberglass Insulation 6-1/4"x15"x93\' 87.19sq ft', defaultQty: 1 },
    { productName: 'R-30 EcoBatt Kraft Faced Fiberglass Insulation 69.33 sqf 1616195', defaultQty: 1 },
    { productName: 'R-10 2"x4\'x8\' Foamular 250 Board Insulation', defaultQty: 1 },
    { productName: 'Insulmax Blow-in Cellulose Insulation', defaultQty: 1 },
    { productName: 'EcoFill WX Fiberglass Blow-in Insulation 106.6 sq ft @ R-19', defaultQty: 1 },
    { productName: 'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x32\'', defaultQty: 1 },
    { productName: 'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x23"x32\'', defaultQty: 1 },
    { productName: 'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x15"x93"', defaultQty: 1 },
    { productName: 'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x23"x93"', defaultQty: 1 },
    { productName: 'R-15 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x18\'', defaultQty: 1 },
    { productName: 'JM Safe & Fireblock 3"x15-1/4"x47" 50sqf', defaultQty: 1 },
  ],

  "Insulation Accessories": [
    { productName: '24" Insulation Support Wire 100ct', defaultQty: 1 },
    { productName: 'Equipment Rental (Insulation)', defaultQty: 1 },
    // Arrow T50 staples not yet in catalog — rep to add manually
    { productName: 'Arrow T50 3/8" Crown x 1/2" Leg Galvanized Heavy-Duty Staples - 5,000 Count', defaultQty: 1 },
    { productName: 'Arrow T50 3/8" Crown x 3/8" Leg Galvanized Heavy-Duty Staples - 5,000 Count', defaultQty: 1 },
    { productName: 'OSI Orange Fire Block Expanding Spray Foam 21.1 oz', defaultQty: 1 },
  ],

  // ---- DRYWALL -----------------------------------------------------------

  "Drywall": [
    { productName: '1/2"x4\'x8\' Drywall', defaultQty: 1 },
    { productName: '1/2"x4\'x8\' M&M Drywall', defaultQty: 1 },
    { productName: '1/2"x4\'x10\' Lightweight Drywall', defaultQty: 1 },
    { productName: '5/8"x4x12 Type X Fire Rated  Drywall', defaultQty: 1 },
    { productName: '1/2"x4\'x8\' ToughRock Basement Board Drywall', defaultQty: 1 },
    { productName: '5/8"x4\'x8\' M&M Type X Drywall', defaultQty: 1 },
    { productName: '3/8"x4\'x8\' Standard Drywall', defaultQty: 1 },
  ],

  "Drywall Accessories": [
    { productName: 'Sheetrock Premixed All-Purpose Joint Compound Pail 4.5 Gallon', defaultQty: 1 },
    { productName: 'Sheetrock Premixed Ultralightweight All-Purpose Joint Compound 4.5 Gallon', defaultQty: 1 },
    { productName: 'USG Plus 3 Joint Compound Carton', defaultQty: 1 },
    { productName: 'Sheetrock 2-16"x500\' Paper Drywall Joint Tape', defaultQty: 1 },
    { productName: 'Metal Corner Bead 1-1/4"x10\'', defaultQty: 1 },
    { productName: 'Flexible Corner Bead 3-1/4"x100\'', defaultQty: 1 },
    { productName: 'ADFORS FibaTape 1-7/8"x500\' Fiberglass Mesh Drywall Joint Tape', defaultQty: 1 },
    { productName: 'ADFORS FibaFuse 2-1/16"x250\' Fiberglass Mesh Drywall Joint Tape', defaultQty: 1 },
    { productName: 'ADFORS FibaFuse MAX 2"x250\' Reinforced Drywall Joint Tape', defaultQty: 1 },
    { productName: '#6x1-5/8" Phillips Drive Coarse Drywall Screws 5000ct', defaultQty: 1 },
  ],

  // ---- FLOORING ----------------------------------------------------------

  "Flooring": [
    { productName: 'Alpine Summit Waterproof Rigid Core LVP 25 sqft per carton $1.29 per Sqft', defaultQty: 1 },
    { productName: 'Piedmont Bend Water Proof Rigid Core Luxury Vinyl  Plank  Foam Pad 28 sqft per carton $1.99 per Sqft', defaultQty: 1 },
    { productName: 'Cedar Point Waterproof Rigid Core Luxury Vinyl Plank Cork Pad 23 sqft per carton $2.79 per Sqft', defaultQty: 1 },
    { productName: 'Glenridge Oak Waterproof Rigid Core Luxury Vinyl Plank Cork Pad 18 sqft per carton $2.99 per Sqft', defaultQty: 1 },
    { productName: 'Gunstock Oak Waterproof Rigid Core Luxury Vinyl Plank Cork Pad 22 sqft per carton $3.29 per Sqft', defaultQty: 1 },
    { productName: 'Champagne Limestone Waterproof Rigid Core Luxury Vinyl Tile Foam Pad 20 sqft per carton $2.99 per Sqft', defaultQty: 1 },
    { productName: 'Sugar Sand Waterproof Rigid Core Luxury Vinyl Plank Cork Pad 22 sqft per carton $4.19 per Sqft', defaultQty: 1 },
    { productName: "Mohawk Impact Mountain Oak Sheet Vinyl 12' Wide", defaultQty: 1 },
    { productName: "Mohawk Impact Ashen Wood Sheet Vinyl 12' Wide", defaultQty: 1 },
  ],

  "Flooring Accessories": [
    { productName: 'Sentinel Protect Plus 600 sqft', defaultQty: 1 },
    { productName: 'Sentinel Protect Plus 300 sqft', defaultQty: 1 },
    { productName: 'Sentinel Protect Plus 100 sqft', defaultQty: 1 },
    { productName: 'Color 5580F 1/4in Vinyl T Mold 94"', defaultQty: 1 },
    { productName: 'Color 1430F 1/2in Laminate T Molding 94"', defaultQty: 1 },
    { productName: 'Kingsbury 94in Laminate Stair Nose 94 In', defaultQty: 1 },
    { productName: 'Glenridge Oak 47in Vinyl Sq Thread 47"x11-1/2"', defaultQty: 1 },
    { productName: 'Hillgrove Mist 48in Laminate Return 47-1/2"x12"', defaultQty: 1 },
    { productName: 'Sentinel Protect Infinity 100sqft Underlayment', defaultQty: 1 },
    { productName: 'Sentinel 6mm Cork Underlayment Roll 194sqft', defaultQty: 1 },
    { productName: 'Work Pro Duct Tape 1.89"x55yrd', defaultQty: 1 },
    { productName: 'Tarkett DT-65 Low Gloss Seam Sealer 2oz', defaultQty: 1 },
    { productName: "Tarkett S875 6\"x20' Floating Vinyl Seam Tape", defaultQty: 1 },
  ],

  // ---- PAINTING ----------------------------------------------------------

  "Painting": [
    { productName: 'Paint', defaultQty: 1 },
  ],

  "Paint Accessories": [
    { productName: 'Linzer Signature Basics Paint Kit 8 Piece', defaultQty: 1 },
    { productName: 'FrogTape 1.88"x60yd Blue Pro Grade Painters Tape 3 Pk', defaultQty: 1 },
    { productName: 'DAP Dynaflex 230 Painters Caulk 10.1oz', defaultQty: 1 },
  ],

  // ---- INTERIOR TRIM -----------------------------------------------------

  "Interior Trim": [
    { productName: "9/16\"x3-1/4\"x10' Craftsman Casing", defaultQty: 1 },
    { productName: "Mastercraft 11/16\"x2-1/4\"x7' FJ Pine Primed Colonial Casing", defaultQty: 1 },
    { productName: "Mastercraft 9/16\"x2-1/4\"x7' Primed MDF Colonial Casing", defaultQty: 1 },
    { productName: "Mastercraft 5/8\"x2-1/4\"x10' Primed MDF Colonial Casing", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x2-1/4\"x12' Primed Finger Jointed Poplar Colonial Casing", defaultQty: 1 },
    { productName: "7-1/6\"x4-1/4\"x12' Primed FJ Pine Craftsman Base", defaultQty: 1 },
    { productName: "1/2\"x3-1/4\"x16' Prefinished Golden Oak Colonial Base", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x4-1/4\"x12' Primed FJ Pine Colonial Base Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x3-1/4\"x12' Primed MDF Colonial Base Moulding Propack 10 120lf", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x3-1/4\"x12' Base Moulding Prefinished Brite White Hardwood 10-Piece", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x3-1/4\"x12' Prefinished Brite White MDF Colonial Base Moulding ProPack 10 120lf", defaultQty: 1 },
    { productName: "Mastercraft 7/16\"x2-3/4\"x12' Primed FJ Pine Ranch Base Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x3-1/4\"x12' Colonial Base Moulding Prefinished Brite White Hardwood", defaultQty: 1 },
    { productName: "Mastercraft 7/16\"x2-3/4\"x12' Primed FJ Pine Colonial Base Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x3/4\"x12' Base Shoe Moulding Prefinished Brite White Hardwood 20-Piece", defaultQty: 1 },
    { productName: "1-1/4\"x1-1/4\" Primed FJ Pine Quarter Round", defaultQty: 1 },
    { productName: "3/4\"x3/4\"x8' Prefinished Golden Oak Quarter Round", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x1/2\"x8' Primed MDF Quarter Round Moulding", defaultQty: 1 },
    { productName: "Mastercraft 3/4\"x3/4\"x12' Primed FJP Quarter Round Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1-1/4\"x1-1/4\" Primed FJ Pine Quarter Round Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1/2\"x1/2\"x8' Primed FJ Pine Quarter Round Moulding", defaultQty: 1 },
    { productName: "Mastercraft 3/4\"x3/4\"x8' Quarter Round Moulding Prefinished Brite White Hardwood", defaultQty: 1 },
    { productName: "Mastercraft 3/4\"x3/4\"x12' Primed MDF Quarter Round Moulding", defaultQty: 1 },
    { productName: "Mastercraft 1-1/4\"x1-1/4\" Unfinished Pine Quarter Round Moulding", defaultQty: 1 },
  ],

  "Interior Trim Accessories": [
    { productName: 'Bostitch 2" 18 Gauge Bright Smooth Shank Flat Head Brad Nails 1000ct', defaultQty: 1 },
    { productName: 'DAP Dynaflex 230 Painters Caulk 10.1oz', defaultQty: 1 },
    { productName: 'Minwax Interior/Exterior Color Changing Natural Wood Filler 8oz', defaultQty: 1 },
    { productName: 'DAP Premium Wood Filler 16oz', defaultQty: 1 },
    { productName: 'DAP Plastic Wood White 6oz', defaultQty: 1 },
  ],

  // ---- INTERIOR DOORS ----------------------------------------------------

  "Interior Doors": [
    { productName: 'Interior SC Doors', defaultQty: 1 },
    { productName: 'Interior HC Doors', defaultQty: 1 },
  ],

  "Interior Door Assembly": [
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
    { productName: '#8x1-1/2" Star Drive ClimaTek Trim Head Wood Screw 100 ct', defaultQty: 1 },
    { productName: 'Bostitch 2" 18 Gauge Bright Smooth Shank Flat Head Brad Nails 1000ct', defaultQty: 1 },
    { productName: 'Interior Door Lock', defaultQty: 1 },
  ],

  // ---- BATHROOM ----------------------------------------------------------

  "Vanity": [
    { productName: 'Craft & Main 60"x22" Gray Vanity and Carrara', defaultQty: 1 },
    { productName: 'Dakota Monroe 30"x21-5/8" Cottage Bathroom Vanity with Top', defaultQty: 1 },
    { productName: 'Tuscany® Ravenna 36"W x 22"D Gray Vanity and Natural Carrara Marble Vanity Top with Left Offset Rectangular Undermount Bowl', defaultQty: 1 },
  ],

  "Vanity Assembly": [
    { productName: 'Grip Fast #10x3-1/2" Star Drive Steel Flat Head Exterior Construction Screw 5#', defaultQty: 1 },
  ],

  "Toilet": [
    { productName: 'Tuscany Huron 2-Piece White Tall', defaultQty: 1 },
    { productName: 'Eljer Diplomat 2-Piece White Standard Height Round Toilet', defaultQty: 1 },
    { productName: 'Briggs Abingdon 2-Piece White Standard Height Elongated Toilet', defaultQty: 1 },
  ],

  "Toilet Assembly": [
    { productName: 'Harvey Toilet Kit', defaultQty: 1 },
  ],

  "Sink": [
    { productName: 'Craft + Main Rivore 20"x17" White Rectangular Bathroom Pedistal Sink with Base', defaultQty: 1 },
    { productName: 'Craft + Main Frederic Pedestal 23-3/4"x19-1/4" White Oval Bathroom Pedistal Sink with Base', defaultQty: 1 },
  ],

  "Sink Assembly": [
    { productName: '3/8"x 20" Compression Faucet line', defaultQty: 1 },
    { productName: 'Plumb Pak 1-1/2" or 1-1/4" Plastic P-Trap Tubing', defaultQty: 1 },
    { productName: 'Plumb Pak 1-1/2"x6" Plastic Sink Tail Piece Tube', defaultQty: 1 },
    { productName: 'Plumb Pak 1-1/2"x12" Plastic Sink Tail Piece Tube', defaultQty: 1 },
    { productName: 'Oatey Stain Free Plumbers Putty 9oz', defaultQty: 1 },
  ],

  "Faucet": [
    { productName: 'American Standard Westerly Two Handle 4" Centerset Legacy Bronze Bathroom Sink Faucet', defaultQty: 1 },
    { productName: 'Delta Foundations One-Handle 4" Centerset Chrome Bathroom Sink Faucet', defaultQty: 1 },
    { productName: 'Delta Geist One-Handle 4" Spotshield Brushed Nickel Bathroom Faucet', defaultQty: 1 },
    { productName: 'Delta Caffery One-Handle 4" Centerset Matte Black Bathroom Sink Faucet', defaultQty: 1 },
    { productName: 'Moen Arlys One-Handle Matte Black Bathroom Faucet', defaultQty: 1 },
    { productName: 'Moen Banbury 8" Wide Spread', defaultQty: 1 },
  ],

  "Faucet Assembly": [
    { productName: 'Blue Monster 3/4"x1429" Teflon Pipe Thread Sealant Tape', defaultQty: 1 },
    { productName: '3/8"x 20" Compression Faucet line', defaultQty: 1 },
  ],

  "Tile": [
    { productName: 'Concept Gray 6"x36" $3.50 15.52sqf', defaultQty: 1 },
    { productName: 'Concrete Grey Matte Ceramic Tile 12"x24" $1.59 sqft 17 sqft per carton', defaultQty: 1 },
    { productName: 'Harmony White Polished Porcelain Tile 12"x24" $1.99 per sqft 1.9 sqft per tile', defaultQty: 1 },
    { productName: 'Industrial Matte Ceramic Mosaic 10"x11" .80 sqft per tile', defaultQty: 1 },
    { productName: 'Cemento Matte Hexagon LL Porcelain Tile 7"x8" .29 sqft per tile', defaultQty: 1 },
    { productName: 'Regency Grey Hexagon Matte Porcelain Mosaic 11"x13" .98 sqft per tile', defaultQty: 1 },
    { productName: 'Regency Gray Matte Porcelain Tile 16"x48" $2.99 per sqft 20 sqft per carton', defaultQty: 1 },
    { productName: 'Venato II Polished Porcelain Tile $2.30 per sqft 13.45 sqft per carton', defaultQty: 1 },
  ],

  "Tile Accessories": [
    { productName: 'Snow White Engineered Stone Curb 6"x74"', defaultQty: 1 },
    { productName: 'Lenox White Marble Curb 6"x74"', defaultQty: 1 },
    { productName: 'Pure White Nanoglass Curb 6"x74"', defaultQty: 1 },
    { productName: 'Mapei Bed Mud', defaultQty: 1 },
    { productName: 'Mapei Mapeguard UM 35 54sqft', defaultQty: 1 },
    { productName: 'Mapei Aqua Defense 1 Gal', defaultQty: 1 },
    { productName: 'Mapei Aqua Defense 3-1/2 Gal', defaultQty: 1 },
    { productName: 'Mapei Aqua Defence 5 Gal', defaultQty: 1 },
    { productName: 'Mapei Ultracolor Plus FA Grout 25#', defaultQty: 1 },
    { productName: 'Schluter Edge Trim 1/2" Anodized Bright White', defaultQty: 1 },
    { productName: 'Schluter Liprotec LED Driver and Dimmer', defaultQty: 1 },
    { productName: 'Schluter Liprotec-CW 26T Cable', defaultQty: 1 },
    { productName: "Schluter Ditra-Drain-STU Seaming Tape 16'x5\" 100532225", defaultQty: 1 },
    { productName: 'Schluter Kerdi Board SC Curb 60"x6"x4-1/2"', defaultQty: 1 },
    { productName: 'Schluter All Set Gray Modified Thin Set', defaultQty: 1 },
    { productName: 'Ultraflex LFT 50#', defaultQty: 1 },
    { productName: 'QEP Lash 1/8" Clip Part A  300pk', defaultQty: 1 },
    { productName: 'QEP Lash 1/16" Clip Part A  300pk', defaultQty: 1 },
    { productName: 'QEP Yellow Wedge Part B 300pk', defaultQty: 1 },
    { productName: 'Mapei 5220 EGG White Mapesil T Plus Silicone Caulk 10.1oz', defaultQty: 1 },
    { productName: 'Mapei 5220 Eggshell Flexcolor CQ Group 1 Gal', defaultQty: 1 },
  ],

  // ---- KITCHEN -----------------------------------------------------------

  "Kitchen Cabinets": [
    { productName: 'Kitchen Budget', defaultQty: 1 },
  ],

  "Kitchen Assembly": [
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
    { productName: '#8x1-1/2" Star Drive ClimaTek Trim Head Wood Screw 100 ct', defaultQty: 1 },
    { productName: 'GE Supreme White Silicone Kitchen & Bath Sealant', defaultQty: 1 },
    { productName: 'GE Supreme Clear Silicone Kitchen & Bath Sealant 10.1oz', defaultQty: 1 },
    { productName: 'GRK #8x2-1/2" Star Drive Wafer Head Cabinet Screw 100ct', defaultQty: 1 },
    { productName: 'GRK #8x2-3/4" Star Drive Wafer Head Cabinet Screw 100ct', defaultQty: 1 },
  ],

  "Kitchen Sink": [
    { productName: 'Moen Alder One Hanfle Pull Down Matte Black Kitchen Faucet', defaultQty: 1 },
    { productName: 'Delta Classic One Handle Pull Down  Stainless Kitchen Faucet', defaultQty: 1 },
    { productName: 'Tuscany Forden One Handle Coil Pull Down Matte Black Kitchen Faucet', defaultQty: 1 },
    { productName: 'Moen Nori One Handle Pull Down Matte Black Pre-Rinse Spring Kitchen Faucet', defaultQty: 1 },
    { productName: 'Kraus Coda Commercial Style 2 Function Single Handle Spot Free Stainless Steel Pull Down Coil Spring', defaultQty: 1 },
  ],

  "Kitchen Sink Assembly": [
    { productName: 'GE Supreme White Silicone Kitchen & Bath Sealant', defaultQty: 1 },
    { productName: 'GE Supreme Clear Silicone Kitchen & Bath Sealant 10.1oz', defaultQty: 1 },
    { productName: 'GRK #8x2-1/2" Star Drive Wafer Head Cabinet Screw 100ct', defaultQty: 1 },
    { productName: 'GRK #8x2-3/4" Star Drive Wafer Head Cabinet Screw 100ct', defaultQty: 1 },
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
  ],

  // ---- COUNTERTOPS -------------------------------------------------------

  "Countertops": [
    { productName: 'Counter Top Budget', defaultQty: 1 },
  ],

  "Countertop Accessories": [
    { productName: 'GE Supreme White Silicone Kitchen & Bath Sealant', defaultQty: 1 },
    { productName: 'GE Supreme Clear Silicone Kitchen & Bath Sealant 10.1oz', defaultQty: 1 },
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
  ],

  // ---- EXTERIOR ----------------------------------------------------------

  "Exterior Trim": [
    { productName: "LP SMARTSIDE 190 TRIM 19/32\"X3\"X16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 440 TRIM 4/4\" X 4\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 440 TRIM 4/4\" X 6\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 440 TRIM 4/4\" X 8\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 440 TRIM 4/4\" X 10\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 440 TRIM 4/4\" X 12\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 540 TRIM 5/4\" X 4\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 540 TRIM 5/4\" X 6\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 540 TRIM 5/4\" X 8\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 540 TRIM 5/4\" X 10\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 540 TRIM 5/4\" X 12\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE SOFFIT SOLID 3/8\" X 12\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE SOFFIT VENTED 3/8\" X 12\" X 16' SNOWSCAPE WHITE", defaultQty: 1 },
    { productName: "LP SMARTSIDE 3/8\" X 4' X 8' NGSL PANEL SNOWSCAPE WHITE", defaultQty: 1 },
  ],

  "Exterior Trim Accessories": [
    { productName: 'NLS RS COIL 2-1/4"  4800CT', defaultQty: 1 },
    { productName: 'LP TOUCH-UP KIT  1 QUART (6 STOCK COLORS)', defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
  ],

  // ---- SIDING ------------------------------------------------------------

  "Siding": [
    { productName: "LP SMARTSIDE LAP - EXPERT FINISH 3/8\" X 8\" X 16' (10 NON-STOCK COLORS)", defaultQty: 1 },
    { productName: 'VARIFORM D4 CONTRACTORS CHOICE (.040)  (ALL COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM D4.5DL CONTRACTORS CHOICE (.040) (ALL COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM TRIPLE 3 CONTRACTORS CHOICE (.040) (ALL COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM D4 CAMDEN POINTE (.044)  (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM D4 CAMDEN POINTE (.044) (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM D4 DL CAMDEN POINTE (.044) (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM VORTEX EXTREME D4 (.046) (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM VORTEX EXTREME  D4 (.046) (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM VORTEX EXTREME D4.5DL (.046) (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM VORTEX EXTREME D4.5DL (.046) (PREMIUM COLORS)', defaultQty: 1 },
  ],

  "Siding Accessories": [
    { productName: 'VARIFORM J-CHANNEL 5/8" PEBBLE FINISH (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM J-CHANNEL 5/8" PEBBLE FINISH (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM J-CHANNEL 7/8" PEBBLE FINISH (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM J-CHANNEL 7/8" PEBBLE FINISH (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM UNDERSILL TRIM (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM UNDERSILL TRIM (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM OUTSIDE CORNER POST 4"(STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM OUTSIDE CORNER POST 4" (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM INSIDE CORNER POST (STANDARD/DARK COLORS)', defaultQty: 1 },
    { productName: 'VARIFORM INSIDE CORNER POST (PREMIUM COLORS)', defaultQty: 1 },
    { productName: 'TRI ROOF NAIL 2" 30#', defaultQty: 1 },
    { productName: 'TRI ROOF NAIL 2-1/2" 30#', defaultQty: 1 },
    { productName: "TRI-BUILT HOUSE WRAP 3'X150'", defaultQty: 1 },
    { productName: "TRI-BUILT HOUSE WRAP 9'X150'", defaultQty: 1 },
    { productName: 'TRI-BUILT BUILDING WRAP TAPE 1-7/8" X 55 YDS', defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
    { productName: 'TRI-BUILT XPS FANFOLD  1/4" (1BDL=2SQ)', defaultQty: 1 },
    { productName: 'TRI-BUILT XPS FANFOLD  3/8" (1BDL=2SQ)', defaultQty: 1 },
    { productName: 'TRI-BUILT ALUMINUM  COIL 24X50 .019', defaultQty: 1 },
    { productName: 'TRI-BUILT ALUMINUM  PVC COIL 24X50 .019', defaultQty: 1 },
    { productName: 'CBM STEEL STARTER STRIP  2-1/2"', defaultQty: 1 },
    { productName: 'Broan Through Wall Bath Vent', defaultQty: 1 },
    { productName: 'TRI-BUILT MOUNT MASTER SCALLOPED', defaultQty: 1 },
    { productName: 'TRI-BUILT SPLIT BLOCK', defaultQty: 1 },
    { productName: 'TRI-BUILT EXHAUST VENT', defaultQty: 1 },
  ],

  // ---- SHUTTERS ----------------------------------------------------------

  "Shutters": [
    { productName: 'Shutters Small', defaultQty: 1 },
    { productName: 'Shutters Large', defaultQty: 1 },
    { productName: 'Shutters Extra Large', defaultQty: 1 },
  ],

  "Shutter Accessories": [
    { productName: 'Loctite PL 8x 10oz', defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
  ],

  // ---- ROOFING -----------------------------------------------------------

  "Roofing": [
    { productName: 'GAF TIMBERLINE HDZ', defaultQty: 1 },
    { productName: 'GAF Timberline UHDZ', defaultQty: 1 },
    { productName: 'GAF FELTBUSTER', defaultQty: 1 },
    { productName: 'GAF WEATHERWATCH', defaultQty: 1 },
    { productName: 'GAF PROSTARTER', defaultQty: 1 },
    { productName: 'GAF TIMBERTEX', defaultQty: 1 },
    { productName: 'GAF SEAL-A-RIDGE', defaultQty: 1 },
    { productName: 'GAF SNOW COUNTRY/ADVANCED', defaultQty: 1 },
    { productName: 'GAF COBRA RIDGE VENT', defaultQty: 1 },
    { productName: 'GAF Liberty Base SA', defaultQty: 1 },
    { productName: 'GAF Liberty Cap SA', defaultQty: 1 },
  ],

  "Roofing Accessories": [
    { productName: "Dormer Flashing 10'", defaultQty: 1 },
    { productName: 'BABYTINS 8X8', defaultQty: 1 },
    { productName: 'TRI-BUILT 1-1/4" COIL NAILS', defaultQty: 1 },
    { productName: 'TRI-BUILT DUOFAST STAPLES 5/16"', defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
    { productName: 'DRIP EDGE 1-3/4"', defaultQty: 1 },
    { productName: 'Gutter Apron', defaultQty: 1 },
    { productName: 'TRI-BUILT LEAD 3" ADJUSTABLE', defaultQty: 1 },
    { productName: 'TRI-BUILT LEAD 4" ADJUSTABLE', defaultQty: 1 },
    { productName: 'TRI-BUILT LEAD 5" ADJUSTABLE', defaultQty: 1 },
    { productName: 'TRI-BUILT SYNTHETIC', defaultQty: 1 },
    { productName: 'TRI-BUILT ICE & WATER', defaultQty: 1 },
    { productName: 'TRI-BUILT SQUARE VENTS', defaultQty: 1 },
    { productName: 'TRI-BUILT SLANT BACK VENTS', defaultQty: 1 },
    { productName: "TRI-BUILT RIDGE VENT 4'", defaultQty: 1 },
    { productName: 'TRI-BUILT RIDGE VENT 3/4"X10.5"X20\'', defaultQty: 1 },
    { productName: "TRI-BUILT OMNI ROLL VENT 30' NAILABLE", defaultQty: 1 },
    { productName: 'TRI-BUILT SPRAY PAINT', defaultQty: 1 },
    { productName: 'Broan 636 Bathroom Vent', defaultQty: 1 },
    { productName: 'Broan 634 Kitchen Vent', defaultQty: 1 },
  ],

  // ---- WINDOWS -----------------------------------------------------------

  "Windows": [
    { productName: 'Vinyl Window Budget', defaultQty: 1 },
    { productName: 'Vinyl Window Large Budget', defaultQty: 1 },
    { productName: 'Vinyl Patio Door Standard', defaultQty: 1 },
    { productName: 'Vinyl Patio Door Custom', defaultQty: 1 },
  ],

  "Window Accessories": [
    { productName: 'Great Stuff Window and Door 12 oz', defaultQty: 1 },
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
    { productName: 'Grip Fast #10x3-1/2" Star Drive Steel Flat Head Exterior Construction Screw 5#', defaultQty: 1 },
    { productName: "4\"x33' Self-Adhesive Ultra Butyl Window Flashing Tape", defaultQty: 1 },
    { productName: "Tite Seal 4\"x33' Self Adhesive Ultra Butyl Window Flashing Tape", defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
  ],

  // ---- EXTERIOR DOOR -----------------------------------------------------

  "Exterior Door": [
    { productName: 'Exterior Door Steel', defaultQty: 1 },
    { productName: 'Exterior Door Fiberglass', defaultQty: 1 },
    { productName: '36"x80" Brown Fiberglass 6-Lite Prehung Exterior Door', defaultQty: 1 },
    { productName: 'Mastercraft Lakeside 36"x80" Prefinished Dark Oak Woodgrain Steel Half Lite Composite Frame Prehung', defaultQty: 1 },
    { productName: 'Mastercraft 36"x80" Primed Steel Internal Grille Half Lite Prehung Exterior Door', defaultQty: 1 },
    { productName: 'Mastercraft 36"x80" Primed Steel Half Lite Prehung Exterior Door', defaultQty: 1 },
    { productName: 'Mastercraft 36"x80" Primed Steel 6-Panel Exterior Door', defaultQty: 1 },
  ],

  "Exterior Door Accessories": [
    { productName: 'Nelson 7-7/8" Beddar Wood Shims 12pk', defaultQty: 1 },
    { productName: 'Great Stuff Window and Door 12 oz', defaultQty: 1 },
    { productName: 'OSI / NPC / TRI  CAULK (12TB PER BOX)', defaultQty: 1 },
    { productName: 'Grip Fast #10x3-1/2" Star Drive Steel Flat Head Exterior Construction Screw 5#', defaultQty: 1 },
  ],

  // ---- DECKING -----------------------------------------------------------
  // NOTE: Deck board materials are calculated automatically by the
  // Measurements → Assembly engine based on the selected material and sqft.
  // Do NOT list individual board SKUs here — they will dump every product
  // onto the estimate as a line item at qty 1.

  "Decking": [],

  "Decking Accessories": [
    { productName: 'ConceaLoc Hidden Fasteners 100 sqft', defaultQty: 1 },
    { productName: 'ConceaLoc Hidden Fasteners 500 sqft Gun', defaultQty: 1 },
    { productName: 'ConceaLoc Hidden Fasteners 1000 sqft', defaultQty: 1 },
    { productName: "Timbertech Joist Tape 1.625\"x65' Rl", defaultQty: 1 },
    { productName: "Timbertech Joist Tape 2.5\"x65' Rl", defaultQty: 1 },
  ],

  // ---- DECK FRAMING -------------------------------------------------------

  "Deck Framing": [
    // CedarTone PT
    { productName: "2\"x4\"x8' CedarTone PT",  defaultQty: 1 },
    { productName: "2\"x4\"x10' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x4\"x12' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x4\"x14' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x4\"x16' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x6\"x8' CedarTone PT",  defaultQty: 1 },
    { productName: "2\"x6\"x10' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x6\"x12' CedarTone PT", defaultQty: 1 },
    { productName: "2\"x6\"x16' CedarTone PT", defaultQty: 1 },
    { productName: "1\"x8\"x8' CedarTone PT",  defaultQty: 1 },
    { productName: "1\"x8\"x12' CedarTone PT", defaultQty: 1 },
    // PT Green - 2x material
    { productName: "2x4x12 PT Green",           defaultQty: 1 },
    { productName: "2\"x2\"x3' PT Green",       defaultQty: 1 },
    { productName: "2\"x2\"x4' PT Green",       defaultQty: 1 },
    { productName: "2\"x2\"x8' PT Green",       defaultQty: 1 },
    { productName: "2\"x4\"x8' PT Green",       defaultQty: 1 },
    { productName: "2\"x4\"x10' PT Green",      defaultQty: 1 },
    { productName: "2\"x4\"x12' PT Green",      defaultQty: 1 },
    { productName: "2\"x4\"x16' PT Green",      defaultQty: 1 },
    { productName: "2\"x6\"x8' PT Green",       defaultQty: 1 },
    { productName: "2\"x6\"x10' PT Green",      defaultQty: 1 },
    { productName: "2\"x6\"x12' PT Green",      defaultQty: 1 },
    { productName: "2\"x6\"x16' PT Green",      defaultQty: 1 },
    { productName: "2\"x8\"x8' PT Green",       defaultQty: 1 },
    { productName: "2\"x8\"x10' PT Green",      defaultQty: 1 },
    { productName: "2\"x8\"x12' PT Green",      defaultQty: 1 },
    { productName: "2\"x8\"x16' PT Green",      defaultQty: 1 },
    { productName: "2\"x10\"x8' PT Green",      defaultQty: 1 },
    { productName: "2\"x10\"x10' PT Green",     defaultQty: 1 },
    { productName: "2\"x10\"x12' PT Green",     defaultQty: 1 },
    { productName: "2\"x10\"x16' PT Green",     defaultQty: 1 },
    { productName: "2\"x12\"x8' PT Green",      defaultQty: 1 },
    { productName: "2\"x12\"x10' PT Green",     defaultQty: 1 },
    { productName: "2\"x12\"x12' PT Green",     defaultQty: 1 },
    // PT Green - 4x structural
    { productName: "4\"x4\"x8' PT Green Structural",  defaultQty: 1 },
    { productName: "4\"x4\"x10' PT Green Structural", defaultQty: 1 },
    { productName: "4\"x4\"x12' PT Green Structural", defaultQty: 1 },
    { productName: "4\"x4\"x16' PT Green Structural", defaultQty: 1 },
    // PT Green - 1x boards
    { productName: "1\"x6\"x8' PT Green",       defaultQty: 1 },
    { productName: "1\"x6\"x12' PT Green",      defaultQty: 1 },
    { productName: "1\"x6\"x16' PT Green",      defaultQty: 1 },
    { productName: "1\"x8\"x8' PT Green",       defaultQty: 1 },
    { productName: "1\"x8\"x10' PT Green",      defaultQty: 1 },
    { productName: "1\"x8\"x12' PT Green",      defaultQty: 1 },
    { productName: "1\"x10\"x8' PT Green",      defaultQty: 1 },
    { productName: "1\"x10\"x12' PT Green",     defaultQty: 1 },
    // Heavy structural
    { productName: "6\"x6\"x10' #2 Critical Structural Green PT", defaultQty: 1 },
    // Panels
    { productName: "AC 2'x8' Heavy Duty Green PT Lattice Panel",  defaultQty: 1 },
    { productName: "AC2 4'x8' Green PT Privacy Lattice Panel",    defaultQty: 1 },
    { productName: "AC2 1/2\"x4'x8' Green PT Plywood",           defaultQty: 1 },
  ],

  "Deck Framing Accessories": [
    { productName: "MiTek 5\"x9-3/4\" Triple Zainc Stringer Hanger",          defaultQty: 1 },
    { productName: "MiTek 5\"x1-9/16\" Steel Single Stud Shoe",                defaultQty: 1 },
    { productName: "2\"x8\"-10\" Joist Hanger",                                defaultQty: 1 },
    { productName: "MiTek 1-9/16\"x10-1/2\" Triple Zinc Deck Tension Tie",    defaultQty: 1 },
    { productName: "MiTek 1-9/16\"x10-1/2\" Triple Zinc Deck Tension Tie Kit 4ct", defaultQty: 1 },
    { productName: "Spax 1/4\"x5\" Black",     defaultQty: 1 },
    { productName: "Spax 1/4\"x4-1/2\" Black", defaultQty: 1 },
    { productName: "Spax 1/4\"x4\" Black",     defaultQty: 1 },
    { productName: "Spax 1/4\"x3-1/2\" Black", defaultQty: 1 },
    { productName: "Spax 1/4\"x3\" Black",     defaultQty: 1 },
    { productName: "Spax 1/4\"x2-1/2\" Black", defaultQty: 1 },
    { productName: "Paslode 2\" Galvanized Ring Shank Exterior 2k Ct",         defaultQty: 1 },
    { productName: "Grip Fast #10x3-1/2\" Star Drive Steel Flat Head Exterior Construction Screw 5#", defaultQty: 1 },
  ],

  // More scopes will be added here as Turk reviews each Excel sheet...
};
