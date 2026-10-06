export const connectorRegistry=[
 {id:'union-budget',status:'implemented',authority:'Ministry of Finance',frequency:'Daily Jan–Feb, weekly otherwise'},
 {id:'cga',status:'implemented',authority:'Controller General of Accounts',frequency:'Daily'},
 {id:'cbdt',status:'not-connected',authority:'Central Board of Direct Taxes',frequency:'After approved source discovery'},
 {id:'pmc-accounts',status:'implemented',authority:'Pune Municipal Corporation',frequency:'Weekly'},
 {id:'city-finance',status:'not-connected',authority:'City Finance',frequency:'Weekly'},
 {id:'data-gov-in',status:'not-connected',authority:'Open Government Data Platform',frequency:'Dataset-specific'},
 {id:'cppp',status:'not-connected',authority:'Central Public Procurement Portal',frequency:'Daily'},
 {id:'cag',status:'not-connected',authority:'Comptroller and Auditor General',frequency:'Weekly'}
] as const;
