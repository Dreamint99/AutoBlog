/** TATA IPL 2027 retained lists, transcribed from the BCCI media advisory of 18 Nov 2026.
 *  * overseas, (T) traded. Purse figures are only the ones stated in the advisory text. */

export type Retained = { name: string; overseas?: boolean; traded?: boolean };

function row(raw: string): Retained {
  const traded = /\(T\)/.test(raw);
  const overseas = raw.includes("*");
  const name = raw.replace("*", "").replace("(T)", "").replace(/\s+/g, " ").trim();
  return { name, overseas: overseas || undefined, traded: traded || undefined };
}

const list = (s: string) => s.split(",").map((x) => row(x.trim())).filter((p) => p.name);

export const IPL_RETAINED: { team: string; short: string; purseLeftCr?: string; players: Retained[] }[] = [
  { team: "Chennai Super Kings", short: "CSK", players: list("Akeal Hosein*, Anshul Kamboj, Ayush Mhatre, Dewald Brevis*, Gurjapneet Singh, Jack Edwards* (T), Jamie Overton*, Kartik Sharma, Liam Livingstone* (T), Mukesh Choudhary, Noor Ahmad*, Rahul Chahar, Ramakrishna Ghosh, Ruturaj Gaikwad, Sanju Samson, Sarfaraz Khan, Shivam Dube, Shreyas Gopal, Urvil Patel") },
  { team: "Delhi Capitals", short: "DC", purseLeftCr: "39.50", players: list("Ashutosh Sharma, Auqib Dar, Axar Patel, David Miller*, KL Rahul, Kyle Jamieson*, Lungisani Ngidi*, Madhav Tiwari, Mukesh Kumar, Prithvi Shaw, Rishabh Pant (T), Sameer Rizvi, Tripurana Vijay, Tristan Stubbs*, Vipraj Nigam, Zeeshan Ansari (T)") },
  { team: "Gujarat Titans", short: "GT", purseLeftCr: "8.75", players: list("Anuj Rawat, Ashok Sharma, Glenn Phillips*, Gurnoor Singh Brar, Harshal Patel (T), Jason Holder*, Jayant Yadav, Jos Buttler*, Kagiso Rabada*, Kumar Kushagra, Manav Suthar, Mohammad Siraj, Mohd. Arshad Khan, Nishant Sindhu, Prasidh Krishna, R. Sai Kishore, Rahul Tewatia, Rashid Khan*, Sai Sudharsan, Shubman Gill, Tom Banton*, Washington Sundar") },
  { team: "Kolkata Knight Riders", short: "KKR", purseLeftCr: "41.65", players: list("Angkrish Raghuvanshi, Anukul Roy, Cameron Green*, Finn Allen*, Harshit Rana, Kartik Tyagi, Manish Pandey, Prashant Solanki, Ramandeep Singh, Rinku Singh, Rovman Powell*, Sarthak Ranjan, Saurabh Dubey, Sunil Narine*, Tim Seifert*, Vaibhav Arora, Varun Chakaravarthy") },
  { team: "Lucknow Super Giants", short: "LSG", purseLeftCr: "47.45", players: list("Abdul Samad, Aiden Markram*, Akash Singh, Akshat Raghuwanshi, Arjun Tendulkar, Arshin Kulkarni, Ayush Badoni, Digvesh Rathi, Josh Inglis*, Kuldeep Yadav (T), Mayank Yadav, Mitchell Marsh*, Mohsin Khan, Mukul Choudhary, Nicholas Pooran*, Prince Yadav, Sam Curran* (T), Shahbaz Ahmed") },
  { team: "Mumbai Indians", short: "MI", players: list("Arshdeep Singh (T), Ashwani Kumar, Corbin Bosch*, Jasprit Bumrah, Mitchell Santner*, Naman Dhir, Quinton de Kock*, Raghu Sharma, Raj Angad Bawa, Rohit Sharma, Ryan Rickelton*, Shardul Thakur, Sherfane Rutherford*, Suryakumar Yadav, Tilak Varma, Will Jacks*") },
  { team: "Punjab Kings", short: "PBKS", players: list("Azmatullah Omarzai*, Ben Dwarshuis*, Cooper Connolly*, Hardik Pandya (T), Harnoor Pannu, Harpreet Brar, Marco Jansen*, Marcus Stoinis*, Musheer Khan, Prabhsimran Singh, Priyansh Arya, Shashank Singh, Shreyas Iyer, Suryansh Shedge, Vishnu Vinod, Vyshak Vijaykumar, Xavier Bartlett*, Yash Thakur, Yuzvendra Chahal") },
  { team: "Rajasthan Royals", short: "RR", players: list("Aman Rao Perala, Brijesh Sharma, Dasun Shanaka*, Dhruv Jurel, Donovan Ferreira*, Jofra Archer*, Lhuan-dre Pretorius*, Manimaran Siddharth (T), Mohammed Shami (T), Nandre Burger*, Ravi Bishnoi, Ravindra Jadeja, Riyan Parag, Sandeep Sharma, Shubham Dubey, Sushant Mishra, Vaibhav Sooryavanshi, Yash Raj Punja, Yashasvi Jaiswal") },
  { team: "Royal Challengers Bengaluru", short: "RCB", players: list("Abhinandan Singh, Bhuvneshwar Kumar, Devdutt Padikkal, Jacob Duffy*, Jitesh Sharma, Jordan Cox*, Josh Hazlewood*, Kanishk Chouhan, Krunal Pandya, Nuwan Thushara*, Phil Salt*, Rajat Patidar, Rasikh Dar, Romario Shepherd*, Suyash Sharma, Tim David*, Venkatesh Iyer, Vicky Ostwal, Virat Kohli, Yash Dayal") },
  { team: "Sunrisers Hyderabad", short: "SRH", purseLeftCr: "40.15", players: list("Abhishek Sharma, Aniket Verma, Brydon Carse*, Eshan Malinga*, Harsh Dubey, Heinrich Klaasen*, Ishan Kishan, Khaleel Ahmed (T), Krains Fuletra, Nathan Ellis* (T), Nitish Kumar Reddy, Pat Cummins*, Praful Hinge, Sakib Hussain, Salil Arora, Shivang Kumar, Smaran Ravichandran, T. Natarajan (T)") },
];

export const IPL_PURSE = {
  retained: 184,
  overseas: 55,
  spentCr: "1,002.05",
  leftCr: "297.95",
  slots: 66,
  overseasSlots: 25,
  released: 89,
  releasedOverseas: 34,
};
