// Category data management utility
// This file processes the Plaid transaction categories for budget selection

// Raw category data from CSV (excluding income categories)
const RAW_CATEGORIES = `
TRANSFER_OUT,TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS,Transfers to an investment or retirement account, including investment apps such as Acorns, Betterment
TRANSFER_OUT,TRANSFER_OUT_SAVINGS,Outbound transfers to savings accounts
TRANSFER_OUT,TRANSFER_OUT_WITHDRAWAL,Withdrawals from a bank account
TRANSFER_OUT,TRANSFER_OUT_ACCOUNT_TRANSFER,General outbound transfers to another account
TRANSFER_OUT,TRANSFER_OUT_OTHER_TRANSFER_OUT,Other miscellaneous outbound transactions
LOAN_PAYMENTS,LOAN_PAYMENTS_CAR_PAYMENT,Car loans and leases
LOAN_PAYMENTS,LOAN_PAYMENTS_CREDIT_CARD_PAYMENT,Payments to a credit card. These are positive amounts for credit card subtypes and negative for depository subtypes
LOAN_PAYMENTS,LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT,Personal loans, including cash advances and buy now pay later repayments
LOAN_PAYMENTS,LOAN_PAYMENTS_MORTGAGE_PAYMENT,Payments on mortgages
LOAN_PAYMENTS,LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT,Payments on student loans. For college tuition, refer to "General Services - Education"
LOAN_PAYMENTS,LOAN_PAYMENTS_OTHER_PAYMENT,Other miscellaneous debt payments
BANK_FEES,BANK_FEES_ATM_FEES,Fees incurred for out-of-network ATMs
BANK_FEES,BANK_FEES_FOREIGN_TRANSACTION_FEES,Fees incurred on non-domestic transactions
BANK_FEES,BANK_FEES_INSUFFICIENT_FUNDS,Fees relating to insufficient funds
BANK_FEES,BANK_FEES_INTEREST_CHARGE,Fees incurred for interest on purchases, including not-paid-in-full or interest on cash advances
BANK_FEES,BANK_FEES_OVERDRAFT_FEES,Fees incurred when an account is in overdraft
BANK_FEES,BANK_FEES_OTHER_BANK_FEES,Other miscellaneous bank fees
ENTERTAINMENT,ENTERTAINMENT_CASINOS_AND_GAMBLING,Gambling, casinos, and sports betting
ENTERTAINMENT,ENTERTAINMENT_MUSIC_AND_AUDIO,Digital and in-person music purchases, including music streaming services
ENTERTAINMENT,ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS,Purchases made at sporting events, music venues, concerts, museums, and amusement parks
ENTERTAINMENT,ENTERTAINMENT_TV_AND_MOVIES,In home movie streaming services and movie theaters
ENTERTAINMENT,ENTERTAINMENT_VIDEO_GAMES,Digital and in-person video game purchases
ENTERTAINMENT,ENTERTAINMENT_OTHER_ENTERTAINMENT,Other miscellaneous entertainment purchases, including night life and adult entertainment
FOOD_AND_DRINK,FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR,Beer, Wine & Liquor Stores
FOOD_AND_DRINK,FOOD_AND_DRINK_COFFEE,Purchases at coffee shops or cafes
FOOD_AND_DRINK,FOOD_AND_DRINK_FAST_FOOD,Dining expenses for fast food chains
FOOD_AND_DRINK,FOOD_AND_DRINK_GROCERIES,Purchases for fresh produce and groceries, including farmers' markets
FOOD_AND_DRINK,FOOD_AND_DRINK_RESTAURANT,Dining expenses for restaurants, bars, gastropubs, and diners
FOOD_AND_DRINK,FOOD_AND_DRINK_VENDING_MACHINES,Purchases made at vending machine operators
FOOD_AND_DRINK,FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK,Other miscellaneous food and drink, including desserts, juice bars, and delis
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS,Books, magazines, and news 
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES,Apparel, shoes, and jewelry
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_CONVENIENCE_STORES,Purchases at convenience stores
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_DEPARTMENT_STORES,Retail stores with wide ranges of consumer goods, typically specializing in clothing and home goods
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_DISCOUNT_STORES,Stores selling goods at a discounted price
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_ELECTRONICS,Electronics stores and websites
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES,Photo, gifts, cards, and floral stores
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_OFFICE_SUPPLIES,Stores that specialize in office goods
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_ONLINE_MARKETPLACES,Multi-purpose e-commerce platforms such as Etsy, Ebay and Amazon
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_PET_SUPPLIES,Pet supplies and pet food
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_SPORTING_GOODS,Sporting goods, camping gear, and outdoor equipment
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_SUPERSTORES,Superstores such as Target and Walmart, selling both groceries and general merchandise
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_TOBACCO_AND_VAPE,Purchases for tobacco and vaping products
GENERAL_MERCHANDISE,GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE,Other miscellaneous merchandise, including toys, hobbies, and arts and crafts
HOME_IMPROVEMENT,HOME_IMPROVEMENT_FURNITURE,Furniture, bedding, and home accessories
HOME_IMPROVEMENT,HOME_IMPROVEMENT_HARDWARE,Building materials, hardware stores, paint, and wallpaper
HOME_IMPROVEMENT,HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE,Plumbing, lighting, gardening, and roofing
HOME_IMPROVEMENT,HOME_IMPROVEMENT_SECURITY,Home security system purchases
HOME_IMPROVEMENT,HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT,Other miscellaneous home purchases, including pool installation and pest control
MEDICAL,MEDICAL_DENTAL_CARE,Dentists and general dental care
MEDICAL,MEDICAL_EYE_CARE,Optometrists, contacts, and glasses stores
MEDICAL,MEDICAL_NURSING_CARE,Nursing care and facilities
MEDICAL,MEDICAL_PHARMACIES_AND_SUPPLEMENTS,Pharmacies and nutrition shops
MEDICAL,MEDICAL_PRIMARY_CARE,Doctors and physicians
MEDICAL,MEDICAL_VETERINARY_SERVICES,Prevention and care procedures for animals
MEDICAL,MEDICAL_OTHER_MEDICAL,Other miscellaneous medical, including blood work, hospitals, and ambulances
PERSONAL_CARE,PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS,Gyms, fitness centers, and workout classes
PERSONAL_CARE,PERSONAL_CARE_HAIR_AND_BEAUTY,Manicures, haircuts, waxing, spa/massages, and bath and beauty products 
PERSONAL_CARE,PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING,Wash and fold, and dry cleaning expenses
PERSONAL_CARE,PERSONAL_CARE_OTHER_PERSONAL_CARE,Other miscellaneous personal care, including mental health apps and services
GENERAL_SERVICES,GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING,Financial planning, and tax and accounting services
GENERAL_SERVICES,GENERAL_SERVICES_AUTOMOTIVE,Oil changes, car washes, repairs, and towing
GENERAL_SERVICES,GENERAL_SERVICES_CHILDCARE,Babysitters and daycare
GENERAL_SERVICES,GENERAL_SERVICES_CONSULTING_AND_LEGAL,Consulting and legal services
GENERAL_SERVICES,GENERAL_SERVICES_EDUCATION,Elementary, high school, professional schools, and college tuition
GENERAL_SERVICES,GENERAL_SERVICES_INSURANCE,Insurance for auto, home, and healthcare
GENERAL_SERVICES,GENERAL_SERVICES_POSTAGE_AND_SHIPPING,Mail, packaging, and shipping services
GENERAL_SERVICES,GENERAL_SERVICES_STORAGE,Storage services and facilities
GENERAL_SERVICES,GENERAL_SERVICES_OTHER_GENERAL_SERVICES,Other miscellaneous services, including advertising and cloud storage 
GOVERNMENT_AND_NON_PROFIT,GOVERNMENT_AND_NON_PROFIT_DONATIONS,Charitable, political, and religious donations
GOVERNMENT_AND_NON_PROFIT,GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES,Government departments and agencies, such as driving licences, and passport renewal
GOVERNMENT_AND_NON_PROFIT,GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT,Tax payments, including income and property taxes
GOVERNMENT_AND_NON_PROFIT,GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT,Other miscellaneous government and non-profit agencies
TRANSPORTATION,TRANSPORTATION_BIKES_AND_SCOOTERS,Bike and scooter rentals
TRANSPORTATION,TRANSPORTATION_GAS,Purchases at a gas station
TRANSPORTATION,TRANSPORTATION_PARKING,Parking fees and expenses
TRANSPORTATION,TRANSPORTATION_PUBLIC_TRANSIT,Public transportation, including rail and train, buses, and metro
TRANSPORTATION,TRANSPORTATION_TAXIS_AND_RIDE_SHARES,Taxi and ride share services
TRANSPORTATION,TRANSPORTATION_TOLLS,Toll expenses
TRANSPORTATION,TRANSPORTATION_OTHER_TRANSPORTATION,Other miscellaneous transportation expenses
TRAVEL,TRAVEL_FLIGHTS,Airline expenses
TRAVEL,TRAVEL_LODGING,Hotels, motels, and hosted accommodation such as Airbnb
TRAVEL,TRAVEL_RENTAL_CARS,Rental cars, charter buses, and trucks
TRAVEL,TRAVEL_OTHER_TRAVEL,Other miscellaneous travel expenses
RENT_AND_UTILITIES,RENT_AND_UTILITIES_GAS_AND_ELECTRICITY,Gas and electricity bills
RENT_AND_UTILITIES,RENT_AND_UTILITIES_INTERNET_AND_CABLE,Internet and cable bills
RENT_AND_UTILITIES,RENT_AND_UTILITIES_RENT,Rent payment
RENT_AND_UTILITIES,RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT,Sewage and garbage disposal bills
RENT_AND_UTILITIES,RENT_AND_UTILITIES_TELEPHONE,Cell phone bills
RENT_AND_UTILITIES,RENT_AND_UTILITIES_WATER,Water bills
RENT_AND_UTILITIES,RENT_AND_UTILITIES_OTHER_UTILITIES,Other miscellaneous utility bills
`;

// Function to format category names for human readability
const formatCategoryName = (categoryName) => {
  return categoryName
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/And/g, 'and')
    .replace(/Or/g, 'or')
    .replace(/The/g, 'the')
    .replace(/Of/g, 'of')
    .replace(/In/g, 'in')
    .replace(/On/g, 'on')
    .replace(/At/g, 'at')
    .replace(/To/g, 'to')
    .replace(/For/g, 'for');
};

// Process raw category data into structured format
const processCategories = () => {
  const categories = {};
  
  RAW_CATEGORIES.trim().split('\n').forEach(line => {
    if (line.trim()) {
      const [primary, detailed, description] = line.split(',');
      if (primary && detailed) {
        const formattedPrimary = formatCategoryName(primary);
        const formattedDetailed = formatCategoryName(detailed.replace(primary + '_', ''));
        
        if (!categories[formattedPrimary]) {
          categories[formattedPrimary] = [];
        }
        
        categories[formattedPrimary].push({
          id: detailed,
          name: formattedDetailed,
          description: description ? description.replace(/"/g, '').trim() : '',
          fullName: `${formattedPrimary} - ${formattedDetailed}`
        });
      }
    }
  });
  
  return categories;
};

// Get all processed categories
export const getCategories = () => processCategories();

// Get primary category names only
export const getPrimaryCategories = () => {
  const categories = processCategories();
  return Object.keys(categories).sort();
};

// Get detailed categories for a specific primary category
export const getDetailedCategories = (primaryCategory) => {
  const categories = processCategories();
  return categories[primaryCategory] || [];
};

// Search categories by text
export const searchCategories = (searchTerm) => {
  const categories = processCategories();
  const results = [];
  
  if (!searchTerm) return results;
  
  const term = searchTerm.toLowerCase();
  
  Object.entries(categories).forEach(([primary, details]) => {
    // Check if primary category matches
    if (primary.toLowerCase().includes(term)) {
      results.push({
        type: 'primary',
        primary,
        name: primary,
        details: details
      });
    }
    
    // Check detailed categories
    details.forEach(detail => {
      if (detail.name.toLowerCase().includes(term) || 
          detail.description.toLowerCase().includes(term)) {
        results.push({
          type: 'detailed',
          primary,
          ...detail
        });
      }
    });
  });
  
  return results;
};

// Get a flat list of all categories for searching
export const getAllCategoriesFlat = () => {
  const categories = processCategories();
  const flat = [];
  
  Object.entries(categories).forEach(([primary, details]) => {
    // Add primary category
    flat.push({
      type: 'primary',
      primary,
      name: primary,
      searchText: primary.toLowerCase()
    });
    
    // Add detailed categories
    details.forEach(detail => {
      flat.push({
        type: 'detailed',
        primary,
        ...detail,
        searchText: `${primary.toLowerCase()} ${detail.name.toLowerCase()} ${detail.description.toLowerCase()}`
      });
    });
  });
  
  return flat;
};