export const TONE = ['#7be0d6','#f7c6a8','#a8c7f7','#d6b8f0','#bfe9a8','#f0b8c8','#a8e0f7','#f7d9a8'];

export const palettes = [
  {name:'Lagoon',  c1:'#7be0d6',c2:'#9ff3ea',c3:'#3aa9c4', water:{deep:[0.016,0.05,0.075],mid:[0.03,0.15,0.2],acc:[0.22,0.78,0.74]}},
  {name:'Amethyst',c1:'#c2a6f5',c2:'#ddc8ff',c3:'#7a57c4', water:{deep:[0.05,0.03,0.085],mid:[0.12,0.07,0.21],acc:[0.6,0.45,0.92]}},
  {name:'Coral',   c1:'#f7ad97',c2:'#ffcdbd',c3:'#d97658', water:{deep:[0.08,0.04,0.04],mid:[0.21,0.1,0.085],acc:[0.96,0.55,0.45]}},
  {name:'Emerald', c1:'#86e3aa',c2:'#c2ffd9',c3:'#379c66', water:{deep:[0.02,0.06,0.04],mid:[0.05,0.18,0.12],acc:[0.4,0.86,0.55]}},
  {name:'Ice',     c1:'#b6c8d8',c2:'#e0ecf5',c3:'#6a8aa3', water:{deep:[0.03,0.045,0.062],mid:[0.1,0.14,0.185],acc:[0.74,0.84,0.92]}},
];

export const STATUS_BG = {
  Active: 'rgba(123,224,214,.16)',
  Recall: 'rgba(168,199,247,.16)',
  New:    'rgba(191,233,168,.16)',
};
export const STATUS_FG = {
  Active: '#7be0d6',
  Recall: '#a8c7f7',
  New:    '#bfe9a8',
};
export const STU_STATUS_BG = {
  'On track': 'rgba(123,224,214,.16)',
  'Ahead':    'rgba(191,233,168,.16)',
  'Behind':   'rgba(247,180,120,.16)',
};
export const STU_STATUS_FG = {
  'On track': '#7be0d6',
  'Ahead':    '#bfe9a8',
  'Behind':   '#f7c089',
};

export const initialPatients = [
  {id:'p1',name:'Amara Okafor', age:29,faculty:'Dr. Lin',  status:'Active',procedure:'Composite restoration · #14',next:'Today · 2:30 PM', badTeeth:['U6','L4']},
  {id:'p2',name:'Theo Marsh',   age:41,faculty:'Dr. Okada',status:'Recall',procedure:'Scaling & root planing',    next:'Thu · 1:00 PM',   badTeeth:['U3','U10','L8']},
  {id:'p3',name:'Priya Nair',   age:23,faculty:'Dr. Lin',  status:'Active',procedure:'Orthodontic review',        next:'Mon · 11:00 AM',  badTeeth:['L1']},
  {id:'p4',name:'Diego Ramos',  age:35,faculty:'Dr. Bell', status:'New',   procedure:'Initial exam & charting',   next:'Fri · 10:00 AM',  badTeeth:[]},
  {id:'p5',name:'Hana Yusuf',   age:52,faculty:'Dr. Okada',status:'Active',procedure:'Crown prep · #19',          next:'Today · 3:15 PM', badTeeth:['L7','L6','U11']},
  {id:'p6',name:'Leo Brandt',   age:18,faculty:'Dr. Bell', status:'Recall',procedure:'Sealants & fluoride',       next:'Wed · 9:30 AM',   badTeeth:['U7']},
];

export const initialApprovals = [
  {id:'a1',student:'Tom Becker', item:'Patient assignment · R. Delgado', type:'Assignment'},
  {id:'a2',student:'Sana Reyes', item:'Case sign-off · Composite #14',   type:'Sign-off'},
  {id:'a3',student:'Omar Haddad',item:'Extraction clearance · #17',       type:'Clearance'},
];

export const studentsData = [
  {name:'Sana Reyes',  year:'Y3',cases:42,pct:68,status:'On track'},
  {name:'Marcus Lee',  year:'Y3',cases:38,pct:61,status:'On track'},
  {name:'Aisha Bello', year:'Y4',cases:71,pct:88,status:'Ahead'},
  {name:'Tom Becker',  year:'Y2',cases:19,pct:34,status:'Behind'},
  {name:'Yuki Tanaka', year:'Y4',cases:64,pct:79,status:'On track'},
  {name:'Omar Haddad', year:'Y3',cases:33,pct:52,status:'Behind'},
];

export const scheduleData = [
  {time:'09:00',patient:'Theo Marsh',   proc:'Scaling & polish',room:'Bay 1',faculty:'Dr. Okada',kind:'Recall',    kindBg:'rgba(168,199,247,.18)',                           kindFg:'#a8c7f7'},
  {time:'10:30',patient:'Diego Ramos',  proc:'Initial exam',    room:'Bay 4',faculty:'Dr. Bell', kind:'New',       kindBg:'rgba(191,233,168,.18)',                           kindFg:'#bfe9a8'},
  {time:'14:30',patient:'Amara Okafor', proc:'Composite #14',   room:'Bay 3',faculty:'Dr. Lin',  kind:'Restorative',kindBg:'color-mix(in srgb,var(--c1) 18%,transparent)', kindFg:'var(--c1)'},
  {time:'15:15',patient:'Hana Yusuf',   proc:'Crown prep #19',  room:'Bay 3',faculty:'Dr. Okada',kind:'Restorative',kindBg:'color-mix(in srgb,var(--c1) 18%,transparent)', kindFg:'var(--c1)'},
];

export const prospectsData = [
  {name:'Marcus Webb', interest:'Whitening consult',  source:'Campus screening', stage:'New lead', stageFg:'#bfe9a8'},
  {name:'Ife Adeyemi', interest:'Wisdom tooth eval',  source:'Faculty referral', stage:'Contacted',stageFg:'#a8c7f7'},
  {name:'Rosa Delgado',interest:'Full charting',      source:'Community clinic', stage:'New lead', stageFg:'#bfe9a8'},
  {name:'Kenji Sato',  interest:'Ortho assessment',   source:'Walk-in',          stage:'Booking',  stageFg:'var(--c1)'},
];

export const weekData = [
  {day:'Mon',time:'11:00',patient:'Priya Nair',  proc:'Ortho review',      room:'Bay 2'},
  {day:'Wed',time:'09:30',patient:'Leo Brandt',  proc:'Sealants',          room:'Bay 1'},
  {day:'Thu',time:'13:00',patient:'Theo Marsh',  proc:'Root planing',      room:'Bay 4'},
  {day:'Fri',time:'10:00',patient:'Diego Ramos', proc:'Follow-up exam',    room:'Bay 3'},
  {day:'Fri',time:'15:30',patient:'Marcus Webb', proc:'Whitening consult', room:'Bay 2'},
];

export const reqsData = [
  {label:'Restorative',    txt:'14 / 20',width:'70%'},
  {label:'Periodontics',   txt:'9 / 15', width:'60%'},
  {label:'Endodontics',    txt:'4 / 10', width:'40%'},
  {label:'Prosthodontics', txt:'6 / 8',  width:'75%'},
];
