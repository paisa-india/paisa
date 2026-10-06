/**
 * Plain-language meaning of national budget items, for the "behind the number" drawer. Facts only: what the item is,
 * and who receives it as far as official records say. `who` is omitted when no recipient type is published.
 */
export type Meaning={what:string;whatHi:string;who?:string;whoHi?:string};
export const NATIONAL:Record<string,Meaning>={
 interest:{what:'The cost of the Union government’s past borrowing: interest on government bonds, treasury bills, small savings (such as PPF and post-office schemes) and provident funds. Repaying the borrowed amount itself is not in this figure; it is counted separately.',
  whatHi:'केंद्र सरकार के पुराने कर्ज़ की लागत: सरकारी बॉन्ड, ट्रेज़री बिल, छोटी बचत (जैसे PPF और डाकघर योजनाएं) और भविष्य निधि पर ब्याज। उधार ली गई मूल राशि लौटाना इसमें शामिल नहीं; वह अलग गिना जाता है।',
  who:'Holders of government securities (banks, insurers, pension and provident funds, RBI and others) and small-savings depositors. Payments to individual holders are not published.',whoHi:'सरकारी प्रतिभूतियों के धारक (बैंक, बीमा कंपनियां, पेंशन और भविष्य निधि, RBI आदि) और छोटी बचत के जमाकर्ता। अलग-अलग धारकों को भुगतान प्रकाशित नहीं होता।'},
 pension:{what:'Pensions for retired Union government employees, including defence and railway pensioners.',whatHi:'केंद्र सरकार के सेवानिवृत्त कर्मचारियों की पेंशन, रक्षा और रेलवे पेंशनभोगियों सहित।',who:'Retired employees and their families. Individual payments are not published.',whoHi:'सेवानिवृत्त कर्मचारी और उनके परिवार। अलग-अलग भुगतान प्रकाशित नहीं होते।'},
 defence:{what:'The armed forces: pay, equipment, weapons, maintenance and defence research. Defence pensions are counted under Pensions.',whatHi:'सशस्त्र बल: वेतन, उपकरण, हथियार, रखरखाव और रक्षा अनुसंधान। रक्षा पेंशन “पेंशन” में गिनी जाती है।'},
 fertiliser:{what:'Payments that keep fertiliser prices low for farmers. The subsidy is paid to fertiliser companies, which sell at a controlled price.',whatHi:'किसानों के लिए खाद सस्ती रखने का भुगतान। सब्सिडी खाद कंपनियों को दी जाती है, जो तय कीमत पर बेचती हैं।',who:'Fertiliser manufacturers and importers. Company-wise payments are not part of this budget figure.',whoHi:'खाद निर्माता और आयातक। कंपनी-वार भुगतान इस बजट आंकड़े में नहीं हैं।'},
 food:{what:'The cost of supplying subsidised or free grain through the public distribution system.',whatHi:'सार्वजनिक वितरण प्रणाली से सस्ता या मुफ़्त अनाज देने की लागत।',who:'Mainly the Food Corporation of India and states that procure grain.',whoHi:'मुख्यतः भारतीय खाद्य निगम और अनाज ख़रीदने वाले राज्य।'},
 petroleum:{what:'Support for cooking gas (LPG) and other petroleum products.',whatHi:'रसोई गैस (LPG) और अन्य पेट्रोलियम उत्पादों के लिए सहायता।'},
 agriculture:{what:'Farming and allied activities: income support, crop insurance, credit support and research.',whatHi:'खेती और संबंधित गतिविधियां: आय सहायता, फ़सल बीमा, ऋण सहायता और अनुसंधान।'},
 commerce:{what:'Industry and trade: production incentives, export support and industrial infrastructure.',whatHi:'उद्योग और व्यापार: उत्पादन प्रोत्साहन, निर्यात सहायता और औद्योगिक ढांचा।'},
 'north-east':{what:'Development spending for the north-eastern states through the ministry for that region.',whatHi:'पूर्वोत्तर राज्यों के विकास के लिए उस क्षेत्र के मंत्रालय के ज़रिए ख़र्च।'},
 education:{what:'Schools and higher education: school schemes, universities, IITs and scholarships.',whatHi:'स्कूल और उच्च शिक्षा: स्कूल योजनाएं, विश्वविद्यालय, IIT और छात्रवृत्ति।'},
 energy:{what:'Power, renewable energy and related infrastructure.',whatHi:'बिजली, नवीकरणीय ऊर्जा और संबंधित ढांचा।'},
 'external-affairs':{what:'Embassies, foreign relations and development help to other countries.',whatHi:'दूतावास, विदेश संबंध और अन्य देशों को विकास सहायता।'},
 finance:{what:'The finance ministry’s own programmes and transfers, apart from interest and taxes.',whatHi:'वित्त मंत्रालय के अपने कार्यक्रम और हस्तांतरण, ब्याज और करों के अलावा।'},
 health:{what:'Hospitals, health schemes, insurance cover and medical research.',whatHi:'अस्पताल, स्वास्थ्य योजनाएं, बीमा और चिकित्सा अनुसंधान।'},
 'home-affairs':{what:'Police forces under the Union, border management, disaster response and Union Territories’ administration.',whatHi:'केंद्र के पुलिस बल, सीमा प्रबंधन, आपदा राहत और केंद्र शासित प्रदेशों का प्रशासन।'},
 'it-telecom':{what:'Digital and telecom programmes, including electronics manufacturing support.',whatHi:'डिजिटल और दूरसंचार कार्यक्रम, इलेक्ट्रॉनिक्स निर्माण सहायता सहित।'},
 rural:{what:'Rural jobs, housing and roads, such as the rural employment guarantee and rural housing schemes.',whatHi:'ग्रामीण रोज़गार, आवास और सड़कें, जैसे ग्रामीण रोज़गार गारंटी और ग्रामीण आवास योजनाएं।'},
 science:{what:'Scientific departments: space, atomic energy, science and technology, earth sciences.',whatHi:'वैज्ञानिक विभाग: अंतरिक्ष, परमाणु ऊर्जा, विज्ञान और प्रौद्योगिकी, पृथ्वी विज्ञान।'},
 'social-welfare':{what:'Support for women and children, social justice, tribal affairs and minorities.',whatHi:'महिलाओं और बच्चों, सामाजिक न्याय, जनजातीय मामलों और अल्पसंख्यकों के लिए सहायता।'},
 'tax-admin':{what:'Running the Union’s tax departments.',whatHi:'कर विभागों का संचालन।'},
 transport:{what:'Highways, railways and other transport infrastructure.',whatHi:'राजमार्ग, रेलवे और अन्य परिवहन ढांचा।'},
 urban:{what:'Urban development: city housing, metro rail and urban schemes.',whatHi:'शहरी विकास: शहरी आवास, मेट्रो रेल और शहरी योजनाएं।'},
 others:{what:'Spending not listed under the major heads above.',whatHi:'ऊपर की मुख्य मदों में शामिल न किया गया ख़र्च।'},
 'total-expenditure':{what:'Everything the Union government plans to spend in the year, on running costs and on building assets.',whatHi:'साल भर में केंद्र सरकार का कुल ख़र्च, चलाने की लागत और संपत्ति बनाने पर।'},
 'revenue-expenditure':{what:'Day-to-day spending that does not create assets: salaries, interest, subsidies, grants.',whatHi:'रोज़मर्रा का ख़र्च जिससे संपत्ति नहीं बनती: वेतन, ब्याज, सब्सिडी, अनुदान।'},
 'capital-expenditure':{what:'Spending that builds or buys assets, such as roads, railways and equipment, plus loans to states and others.',whatHi:'संपत्ति बनाने या ख़रीदने का ख़र्च, जैसे सड़कें, रेलवे और उपकरण, और राज्यों आदि को ऋण।'},
 'borrowing':{what:'Money the Union government borrows to cover the gap between what it spends and what it earns (the fiscal deficit).',whatHi:'ख़र्च और कमाई के अंतर (राजकोषीय घाटा) को पूरा करने के लिए केंद्र सरकार का उधार।'},
 'net-tax':{what:'Taxes the Union keeps after passing the states their share.',whatHi:'राज्यों को उनका हिस्सा देने के बाद केंद्र के पास बचे कर।'},
 'gst':{what:'The Union’s part of GST collections.',whatHi:'GST संग्रह में केंद्र का हिस्सा।'},
 'income-tax':{what:'Tax on personal income (including securities transaction tax).',whatHi:'व्यक्तिगत आय पर कर (प्रतिभूति लेनदेन कर सहित)।'},
 'corporation-tax':{what:'Tax on company profits.',whatHi:'कंपनियों के मुनाफ़े पर कर।'},
};
/** Plain words for the kind of figure. */
export const VALUE_TYPE:Record<string,[string,string]>={BE:['Budget estimate: what was planned','बजट अनुमान: जो योजना बनी'],RE:['Revised estimate: the plan updated during the year','संशोधित अनुमान: साल के बीच बदली योजना'],
 ACTUAL:['Actual: what was recorded in the accounts','वास्तविक: खातों में दर्ज'],RELEASE:['Fund release','धन जारी'],TENDER_VALUE:['Tender value','निविदा मूल्य'],AWARDED_VALUE:['Awarded contract value','आवंटित अनुबंध मूल्य'],
 PAYMENT:['Actual payment','वास्तविक भुगतान'],SANCTIONED:['Sanctioned amount','स्वीकृत राशि']};
