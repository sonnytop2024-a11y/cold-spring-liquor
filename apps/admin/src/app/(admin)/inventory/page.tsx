"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, Search, Package, X, Check, ImageIcon,
  Star, ChevronDown, Upload, Download, CheckCircle2, Wand2, Tag, Zap,
} from "lucide-react";
import { ImportModal } from "./ImportModal";
import { CategoriesModal } from "./CategoriesModal";
import { API } from "@/lib/api";

// ── Export helper (CSV generated in browser) ──────────────────────────────────
function csvQ(val: unknown): string {
  const s = String(val ?? "");
  // Always quote strings to prevent comma-in-value breaking column alignment
  return `"${s.replace(/"/g, '""')}"`;
}

async function exportProductsCSV() {
  const res = await fetch(`${API}/admin/products`);
  const json = await res.json();
  const products = (Array.isArray(json) ? json : (json.products ?? json.data ?? [])) as Record<string, unknown>[];

  const headers = ["SKU","Product Name","action","Brand","Category","Price","Sale Price",
    "Stock Qty","Volume","ABV","Country","Description","Image URL","Active","Featured"];

  const rows = products.map((p) => [
    csvQ(p.id), csvQ(p.name), "",
    csvQ(p.brand), csvQ(p.category), p.price ?? "", p.salePrice ?? "",
    p.stockQty ?? "", csvQ(p.volume), p.abv ?? "", csvQ(p.country),
    csvQ(p.description), csvQ(p.imageUrl ?? ""),
    p.active ? "yes" : "no", p.featured ? "yes" : "no",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `csl-products-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CATEGORIES_FALLBACK: { value: string; label: string }[] = [
  { value: "whiskey",   label: "Whiskey" },
  { value: "scotch",    label: "Scotch" },
  { value: "tequila",   label: "Tequila" },
  { value: "vodka",     label: "Vodka" },
  { value: "rum",       label: "Rum" },
  { value: "gin",       label: "Gin" },
  { value: "wine",      label: "Wine" },
  { value: "beer",      label: "Beer" },
  { value: "champagne", label: "Champagne" },
  { value: "cognac",    label: "Cognac" },
  { value: "rtd",       label: "RTD" },
  { value: "mixer",     label: "Mixer" },
  { value: "liqueur",   label: "Liqueur" },
  { value: "rare",      label: "💎 Hard to Find" },
  { value: "other",     label: "Other" },
];

// ── Auto-categorize: keyword + brand lookup ───────────────────────────────────
const KEYWORD_MAP: { keywords: string[]; category: string }[] = [
  // Non-alcoholic mixers/sodas — catch first before spirit keywords
  { keywords: [
    "tonic water","club soda","simple syrup","grenadine","ginger beer","ginger ale",
    "canada dry","diet tonic","sparkling water","bottle water","bottled water",
    "perrier","pellegrino","mineral water","sparkling water",
    "energy drink","5 hour energy","5-hour energy","monster energy","monster ultra","monster zero",
    "red bull","redbull",
    "margarita mix","margarita rdy","mrg mix","bloody mary mix","cocktail mix","mstr mix",
    "master mix","mr & mrs t","mr & mrs","sweet & sour","sour mix",
    "lemon juice","lime juice","key lime juice","cranberry juice","pineapple juice",
    "dole juice","orange juice","fruit juice","fresh lime","fresh lemon","fresh lemon",
    "cranberry","powerade","snapple","minute maid","simply orange","organic lemonade",
    "gatorade","g fruit punch","g lemon lime","g orange ","g blue","g cool","g grape","g green","g zero",
    "7 up","dr pepper","dr peper","diet dr pepper","diet dr peper","diet dr p",
    "fresca","coca cola","coca-cola","coke cherry","diet coke","coke zero","coke 1","coke 2","pepsi","sprite","big red","mexico coke","soda 1","soda 2","soda 3","soda 4","soda 12",
    "lemonade","lemon ade","mm lemonade",
    "maraschino cherry","filthy","lime ","coco lopez",
    "margarita salt","drink ade","never hungover","redeye tx","redey tx","schweppes",
  ], category: "mixer" },
  // Beer — pack formats + beer styles
  { keywords: [
    "beer","lager","ale","ipa","stout","porter","pilsner","pale ale","amber ale",
    "wheat beer","hefeweizen","hefewzn","hefe","kolsch","schwarzbier",
    "hard cider","malt beverage","malt liquor","malt liq","high gravity","apple cider",
    "4/6/12","4/6/16","4/6/11","4/6/14","4/12","4/6 cn","4/6 nr","4/12 cn","4/12 nr",
    "6/12 cn","8/16 cn","2/12 cn","2/12 nr","1/18/12","1/24/","18 pk","18pk","6/4 pk","4/6 pk",
    "2/9/16","kar variety","15 cn","24 cn","6/4/16","6/4/12","6/4/8",
    "nr 12oz","cn 12oz","cn 16oz","cn 24oz","nr 22oz","nr 40oz","cn 23.5oz","nr 40","cn 25oz",
    "4/6cn","4/6pk","pk cn","pk nr"," 4pk "," 6pk "," 12pk "," 24pk ","15pk","shock top",
    " 12 cn"," 16 cn"," 12 nr"," 24 nr",
    "6can","12can","12cans","6 can","12 can","19.2","variety 12can",
    " cider","cider variety","pineapple 6can",
  ], category: "beer" },
  // Scotch
  { keywords: [
    "scotch","highland","speyside","islay","single malt","blended malt","blended scotch",
    "sctch","mlt sctch","mllt sctch","mlt scth","scth",
    "smsw","sngl mlt","sngl mllt","hghlnd","lowland sngl","hghlnd mist",
  ], category: "scotch" },
  // Whiskey — includes moonshine, rye, whis abbreviations
  { keywords: [
    "whiskey","whisky","bourbon","tennessee","irish whiskey","japanese whisky",
    "whsky","wsky","wski","whksy","wskey"," bbn "," brbn ",
    "strt bbn","strgt bbn","strght bbn","kntcky strght","ky strt bbn",
    "wheat whsky","hot cinn wsky","cinn wsky","fire whsky",
    "rye whiskey","rye wh","rock & rye","rock and rye",
    "canadian","canadn","cndnn",
    " rye "," rye,"," rye.",
    "moonshine","moon shine",
    " whis "," whis,","blended whis","ir whis","ir w ",
    " whi 7"," whi 1"," whi 5"," whi 9",
  ], category: "whiskey" },
  // Tequila — full + abbreviated (TEQ, TEQL, TEG, REPO, SILVER)
  { keywords: [
    "tequila","mezcal","reposado","blanco","anejo","añejo","cristalino",
    " teq "," teql "," teg ","teq blnco","teq rpsdo","teq rnjo","teq sil","teq plat",
    "plat teq","blnco tql","rpsdo tql",
    " repo "," repo,"," repo.","silver teg","blanco teg","repo teg",
  ], category: "tequila" },
  // Vodka
  { keywords: ["vodka","vdka","vdk","vodca","everclear"], category: "vodka" },
  // Rum
  { keywords: [
    "rum","rhum","cachaça","cachaca","spiced rum","dark rum","white rum","gold rum",
    "spcd rum","spcd brl","prvt stock rum","cannon blast","coconut rum","tropical rum",
  ], category: "rum" },
  // Gin
  { keywords: ["gin","genever","london dry"], category: "gin" },
  // Wine — includes loose "cab" abbreviation common in product names
  { keywords: [
    "wine","rosé","rose","merlot","chardonnay","cabernet","sauvignon","shiraz",
    "riesling","moscato","port wine","red blend","white blend","zinfandel","malbec",
    "chard","mrlt","sauv blnc","sauv bl ","sauv blan","sau blanc","sau blan",
    "cab sauv","cab sau","cab franc",
    " cab 7"," cab 1"," cab 9"," cab 3"," cab 5"," cab 4",
    " cab,"," cab."," cab$",
    "pinot nir","pinot grg","pinot grgio","pinot noir","pinot grigio",
    "p grigio","p.grigio","p.grgio","p noir","p.noir",
    "sauv blanc","mlbc","ries ","malbec arg",
    " zin ","zins ","zinfadel","syrah","grenache","montepulciano","trebbiano",
    "vermouth","vrmth","dry vermouth","sweet vermouth",
    "red blnd","rd blnd","red blend","sangria","primitivo","falanghina","cab franc",
    "rsrv red","rsrv white","barossa","sake",
    "chianti","brunello","amarone","pinot gris","gewurz",
    "syrh","sauv blan","saug blanc","saug blan","sauv blnc","sau blan","sau blanc",
    "macbec","macbek","malbec arg","cab sau ","cabernet franc",
    " porto"," port "," cuvee","chadonnay","resling","resling ",
  ], category: "wine" },
  // Champagne
  { keywords: [
    "champagne","sparkling wine","cava","brut","champ","chmpgn","x-dry",
    "prosecco","prscco","prsco","asti ",
  ], category: "champagne" },
  // Cognac / Brandy
  { keywords: [
    "cognac","brandy","armagnac","calvados","pisco",
    "brndy","brndi","cgnc","ambr brndy","vsop brndy","xo brndy","spiced brndy",
  ], category: "cognac" },
  // Liqueur
  { keywords: [
    "liqueur","liquer","schnapps","schnps","schnp"," snp ","creme de","crème de","cr de ",
    "triple sec","amaretto","limoncello","chambord","cointreau","sambuca",
    "frangelico","drambuie","kahlua","kahlúa","baileys","jagermeister","jägermeister",
    "fireball","rumchata","frappachata","frapa chata","frappa chata","midori",
    "st-germain","aperol","campari","disaronno","benedictine",
    "irish cream","irs crem","ir crm","crm liq","crem liq","choc liq","choc lqr",
    " liq "," lqr ","orgnl liq","irish crm","irsh crm","absinthe","absinth",
    "curacao","curaçao","buttershots","pepmint","peachtree","razzmatazz","puckers",
    "egg nog","eggnog","egg-nog","salted caramel cream",
  ], category: "liqueur" },
  // RTD / Hard Seltzers / Premixed cocktails
  { keywords: [
    "hard seltzer","seltzer","hard tea","twisted tea","white claw","truly hard",
    "bud light seltzer","high noon","cutwater","four loko","4 loko",
    "spiked lemonade","spiked punch","spiked","ready to drink",
    "buzzballz","buzzball","mike's hard","mikes hard","smirnoff ice",
    "seagram's escape","seagrams escape","st ides","earthquake",
    "long island iced tea","long isl","lng isl","island iced tea",
    "parrot bay","prrt bay","pina colada","pina col","pssn frt","pineapl strw",
    "bahama mama","mai tai","daiquiri","mudslide","chi chi",
    "beatbox","babe red","babe rose","capriccio","bubbly sangria",
    "ice black","ice cherry","ice kiwi","ice orange","ice peach","ice strawberry",
    "wicked apple","wicked black","redds wicked","redd's wicked",
    "salvadors marg","salvador marg"," marg 2"," marg 1"," prem marg",
  ], category: "rtd" },
];

const BRAND_MAP: Record<string, string> = {
  // Vodka
  "tito's": "vodka", "titos": "vodka", "absolut": "vodka", "grey goose": "vodka",
  "smirnoff": "vodka", "belvedere": "vodka", "ciroc": "vodka", "ketel one": "vodka",
  "skyy": "vodka", "new amsterdam": "vodka", "pinnacle": "vodka", "stolichnaya": "vodka",
  "stoli": "vodka", "finlandia": "vodka", "three olives": "vodka", "burnett's": "vodka",
  "burnetts": "vodka", "deep eddy": "vodka", "tvarscki": "vodka", "vladivvar": "vodka",
  "svedka": "vodka", "luksusowa": "vodka", "monopolova": "vodka", "żubrówka": "vodka",
  "zubrowka": "vodka", "crystal palace": "vodka", "taaka": "vodka", "popov": "vodka",
  // Whiskey
  "jack daniel": "whiskey", "jack daniels": "whiskey", "jim beam": "whiskey",
  "maker's mark": "whiskey", "makers mark": "whiskey", "wild turkey": "whiskey",
  "bulleit": "whiskey", "woodford reserve": "whiskey", "knob creek": "whiskey",
  "jameson": "whiskey", "bushmills": "whiskey", "tullamore": "whiskey",
  "crown royal": "whiskey", "canadian club": "whiskey", "seagram's": "whiskey", "seagrams": "whiskey",
  "george dickel": "whiskey", "evan williams": "whiskey", "heaven hill": "whiskey",
  "old forester": "whiskey", "four roses": "whiskey", "elijah craig": "whiskey",
  "angel's envy": "whiskey", "angels envy": "whiskey", "larceny": "whiskey",
  "buffalo trace": "whiskey", "eagle rare": "whiskey", "blanton's": "whiskey", "blantons": "whiskey",
  "weller": "whiskey", "pappy": "whiskey", "old grand-dad": "whiskey", "old granddad": "whiskey",
  "rebel": "whiskey", "fighting cock": "whiskey", "ancient age": "whiskey",
  "1792": "whiskey", "michter's": "whiskey", "michters": "whiskey",
  "templeton": "whiskey", "whistle pig": "whiskey", "whistlepig": "whiskey",
  // Scotch
  "johnnie walker": "scotch", "johnie walker": "scotch", "glenfiddich": "scotch",
  "macallan": "scotch", "the macallan": "scotch", "glenlivet": "scotch",
  "chivas regal": "scotch", "chivas": "scotch", "dewar's": "scotch", "dewars": "scotch",
  "laphroaig": "scotch", "balvenie": "scotch", "oban": "scotch", "dalmore": "scotch",
  "highland park": "scotch", "glenfarclas": "scotch", "aberlour": "scotch",
  "bowmore": "scotch", "ardbeg": "scotch", "glenmorangie": "scotch", "benriach": "scotch",
  "grants": "scotch", "grant's": "scotch", "famous grouse": "scotch", "black label": "scotch",
  "monkey shoulder": "scotch",
  // Tequila
  "patron": "tequila", "patrón": "tequila", "casamigos": "tequila",
  "don julio": "tequila", "espolon": "tequila", "el jimador": "tequila",
  "hornitos": "tequila", "1800": "tequila", "sauza": "tequila", "herradura": "tequila",
  "olmeca": "tequila", "clase azul": "tequila", "corazon": "tequila", "corazón": "tequila",
  "cuervo": "tequila", "jose cuervo": "tequila", "cazadores": "tequila",
  "milagro": "tequila", "tres generaciones": "tequila", "tres gen": "tequila",
  "casa noble": "tequila", "gran centenario": "tequila", "centenario": "tequila",
  "lunazul": "tequila", "agavales": "tequila", "pueblo viejo": "tequila",
  "chamucos": "tequila", "el mayor": "tequila", "arette": "tequila",
  "tapatio": "tequila", "siete leguas": "tequila", "fortaleza": "tequila",
  // Rum
  "bacardi": "rum", "captain morgan": "rum", "cap morgan": "rum", "malibu": "rum", "kraken": "rum",
  "myers's": "rum", "myers": "rum", "mount gay": "rum", "appleton": "rum",
  "plantation": "rum", "sailor jerry": "rum", "gosling's": "rum", "goslings": "rum",
  "havana club": "rum", "ron zacapa": "rum", "flor de caña": "rum", "flor de cana": "rum",
  "don q": "rum", "brugal": "rum", "barcelo": "rum", "diplomatico": "rum",
  "bumbu": "rum", "angostura": "rum", "three rolls": "rum",
  // Gin
  "tanqueray": "gin", "hendrick's": "gin", "hendricks": "gin", "bombay": "gin",
  "beefeater": "gin", "gordon's": "gin", "gordons": "gin", "broker's": "gin",
  "aviation": "gin", "monkey 47": "gin", "roku": "gin", "botanist": "gin",
  "malfy": "gin", "nolet's": "gin", "nolets": "gin", "empress": "gin",
  // Beer
  "budweiser": "beer", "bud light": "beer", "bud": "beer", "coors": "beer",
  "miller": "beer", "heineken": "beer", "corona": "beer", "modelo": "beer",
  "stella artois": "beer", "guinness": "beer", "blue moon": "beer",
  "dos equis": "beer", "pacifico": "beer", "tecate": "beer", "michelob": "beer",
  "yuengling": "beer", "sam adams": "beer", "samuel adams": "beer",
  "sierra nevada": "beer", "dogfish head": "beer", "lagunitas": "beer",
  "new belgium": "beer", "shiner": "beer", "lone star": "beer",
  "pabst": "beer", "pbr": "beer", "natural light": "beer", "natty light": "beer",
  "keystone": "beer", "busch": "beer", "rolling rock": "beer", "red stripe": "beer",
  "amstel": "beer", "becks": "beer", "beck's": "beer", "fosters": "beer",
  "kirin": "beer", "sapporo": "beer", "asahi": "beer", "peroni": "beer",
  "modelo especial": "beer", "negra modelo": "beer", "victoria": "beer",
  // Wine
  "barefoot": "wine", "yellow tail": "wine", "sutter home": "wine",
  "beringer": "wine", "robert mondavi": "wine", "kendall-jackson": "wine",
  "josh cellars": "wine", "la marca": "wine", "kim crawford": "wine",
  "meiomi": "wine", "apothic": "wine", "menage a trois": "wine",
  "chateau": "wine", "bota box": "wine", "black box": "wine",
  "franzia": "wine", "cook's": "wine", "cooks": "wine",
  // Champagne / Sparkling
  "moët": "champagne", "moet": "champagne", "veuve clicquot": "champagne",
  "dom perignon": "champagne", "korbel": "champagne", "freixenet": "champagne",
  "mumm": "champagne", "perrier-jouet": "champagne", "piper-heidsieck": "champagne",
  "chandon": "champagne",
  // Cognac / Brandy
  "hennessy": "cognac", "rémy martin": "cognac", "remy martin": "cognac",
  "courvoisier": "cognac", "martell": "cognac", "d'ussé": "cognac", "dusse": "cognac",
  "e&j": "cognac", "paul masson": "cognac", "christian brothers": "cognac",
  "korbel brandy": "cognac",
  // RTD
  "buzzballz": "rtd", "buzzball": "rtd", "white claw": "rtd", "truly": "rtd",
  "twisted tea": "rtd", "mike's hard": "rtd", "mikes hard": "rtd",
  "smirnoff ice": "rtd", "seagram's escapes": "rtd", "seagrams escapes": "rtd",
  "bud light seltzer": "rtd", "high noon": "rtd", "cutwater": "rtd",
  "press": "rtd", "cacti": "rtd", "vizzy": "rtd", "topo chico hard": "rtd",
  // More whiskey brands
  "early times": "whiskey", "iw harper": "whiskey", "i.w. harper": "whiskey",
  "cinerator": "whiskey", "duke kentucky": "whiskey", "duke kntcky": "whiskey",
  "basil hayden": "whiskey", "ezra brooks": "whiskey", "e.h. taylor": "whiskey",
  "eh taylor": "whiskey", "hankey bannister": "scotch", "herman marshall": "whiskey",
  "hochstadter": "whiskey", "legacy canadian": "whiskey", "alberta rye": "whiskey",
  "john barr": "scotch", "mcclellands": "scotch", "auchentoshan": "scotch",
  "dekpr": "liqueur",
  "chi chi's": "rtd", "chi chi": "rtd",
  "canada dry": "mixer", "coca cola": "mixer", "cocacola": "mixer",
  "14 hands": "wine", "7 deadly zins": "wine", "alamos": "wine",
  "bv ries": "wine", "bv coastal": "wine", "cavit": "wine",
  "charles smith": "wine", "cupcake": "wine", "ecco domani": "wine",
  "freakshow": "wine", "gascon": "wine", "gnarly head": "wine",
  "macmurray": "wine", "mark west": "wine", "menge a trois": "wine",
  "mirassou": "wine", "lamarca": "champagne",
  "martini & rossi": "wine", "martini rossi": "wine",
  "99 bananas": "liqueur", "copper & kings": "liqueur",
  "x-rated": "liqueur", "x rated": "liqueur", "candy's": "liqueur",
  // Whiskey brands (typos + real)
  "black velvet": "whiskey", "bird dog": "whiskey", "ole smoky": "whiskey",
  "america born": "whiskey", "balcones": "whiskey", "daviess county": "whiskey",
  "cedar ridge": "whiskey", "clontarf": "whiskey", "knappogue": "whiskey",
  "james e pepper": "whiskey", "cowboy blended": "whiskey",
  "angles anvy": "whiskey", "angle's envy": "whiskey",
  "evan william": "whiskey", "evan willim": "whiskey",
  "bushmill": "whiskey", "bond lillard": "whiskey", "firefly moonshine": "whiskey",
  "8 years in the": "whiskey", "devils river": "whiskey", "devil's river": "whiskey",
  "chopin": "vodka",
  // Tequila brands (typos + real)
  "avion": "tequila", "1824": "tequila", "campo bravo": "tequila",
  "casa mexico": "tequila", "don nacho": "tequila", "embajador": "tequila",
  "d ramon": "tequila", "don ramon": "tequila", "hacienda silver": "tequila",
  "camarene": "tequila", "casamogos": "tequila",
  // Rum brands (typos + real)
  "cruzan": "rum", "blue chair bay": "rum", "barcadi": "rum",
  "captian morgan": "rum", "catain morgan": "rum",
  // Wine brands
  "19 crimes": "wine", "dreaming tree": "wine", "duchman": "wine",
  "federalist": "wine", "firestone": "wine", "guenoc": "wine",
  "fat bastard": "wine", "humble pie": "wine", "joel gott": "wine",
  "justin": "wine", "kenwood": "wine", "barossa valley": "wine",
  "casillero": "wine", "concanon": "wine", "concannon": "wine",
  "cooper and thief": "wine", "chop shop": "wine", "crios": "wine",
  "district 7": "wine", "dreaming": "wine", "epica": "wine",
  "fire oak": "wine", "frankly organic": "wine",
  "beckers": "wine", "leyendas": "wine", "mond cab": "wine",
  "blank stare": "wine", "bull and bear": "wine", "beso del sol": "wine",
  "black oak": "wine", "feudi": "wine", "hana sake": "wine", "jre": "wine",
  "piccini": "wine", "ruffino": "wine", "rodney strong": "wine", "saint verny": "wine",
  "s sohne": "wine", "region i": "wine", "dream line": "wine", "hayes valley": "wine",
  "paul masion": "wine",
  "pinch dimple": "scotch", "pinch de": "scotch", "jura": "scotch",
  "loch lomond": "scotch", "shackleton": "scotch",
  "dewar ": "scotch",
  "red river": "whiskey", "cowboy": "whiskey", "maker's 46": "whiskey",
  "maker's": "whiskey", "high west": "whiskey", "revel stoke": "whiskey",
  "select club": "whiskey", "midleton": "whiskey",
  "outer space": "vodka", "new ams ": "vodka", "mohawk": "vodka",
  "khortytsa": "vodka", "cathead": "vodka", "cat head": "vodka",
  "monte alban": "tequila", "margaritaville": "tequila",
  "maestro dobel": "tequila", " jose ": "tequila",
  "rico bay": "rum", "cm 50": "rum",
  "gran gala": "liqueur", "st~german": "liqueur", "st germain": "liqueur",
  "mandarine napoleon": "liqueur", "romana": "liqueur",
  "harveys bristol": "liqueur", "harvey's bristol": "liqueur",
  "ryans cream": "liqueur", "ryan's cream": "liqueur",
  "redds wicked": "rtd", "redd's wicked": "rtd", "blood & honey": "rtd",
  "monaco black": "rtd", "monaco citrus": "rtd", "monaco mango": "rtd",
  "ritas cherry": "rtd", "ritas lime": "rtd", "ritas ": "rtd",
  "rahr": "beer", "montecore": "beer", "hop & grain": "beer",
  "lagunita": "beer", "saint archer": "beer",
  "foster's": "beer", "deschutes": "beer",
  "sangre de toro": "wine", "santa rita": "wine", "sileni": "wine",
  "schmitt sohne": "wine", "schramsberg": "champagne", "j vineyards": "champagne",
  "sandeman": "wine", "marques de caceres": "wine", "serena sweet": "wine",
  // Liqueur brands
  "benedictine": "liqueur", "carolans": "liqueur", "dr mc": "liqueur",
  "dr mcgillicuddy": "liqueur", "frappachata": "liqueur",
  "adelheid": "liqueur", "adelaide's": "liqueur",
  // More tequila brands
  "cabrito": "tequila", "deleon": "tequila", "de leon": "tequila",
  "dulce vida": "tequila", "familia camarena": "tequila", "camarena": "tequila",
  // More vodka brands
  "enchanted rock": "vodka", "cinco vdka": "vodka", "cinco vodka": "vodka",
  // More rum brands
  "flor cana": "rum",
  // More beer brands
  "estrella jalisco": "beer", "ballast point": "beer", "ballast pt": "beer",
  "hops&grain": "beer", "hops & grain": "beer", "icehouse": "beer", "hurricane hg": "beer",
  // More wine brands
  "dark horse": "wine",
  // More champagne brands
  "andre": "champagne", "clicquot": "champagne", "veuve": "champagne",
  "cardhu": "scotch", "clynelish": "scotch", "bernheim": "whiskey",
  // More cognac brands
  "christian bros": "cognac",
  // More liqueur brands
  "godiva": "liqueur", "hpnotiq": "liqueur",
  "brady's irish cream": "liqueur", "bradys irish cream": "liqueur",
  "emmet's irish cream": "liqueur", "emmets irish cream": "liqueur",
  "don pedro": "liqueur",
  // More RTD
  "cm parrot bay": "rtd", "parrot bay": "rtd", "four loko": "rtd",
  // Liqueur
  "baileys": "liqueur", "bailey's": "liqueur", "kahlúa": "liqueur", "kahlua": "liqueur",
  "jägermeister": "liqueur", "jagermeister": "liqueur", "fireball": "liqueur",
  "disaronno": "liqueur", "midori": "liqueur", "dr. mcgillicuddy": "liqueur",
  "rumchata": "liqueur", "frangelico": "liqueur", "st-germain": "liqueur",
  "aperol": "liqueur", "campari": "liqueur", "cointreau": "liqueur",
  "grand marnier": "liqueur", "amaretto": "liqueur", "di amore": "liqueur",
  "dekuyper": "liqueur", "de kuyper": "liqueur", "leroux": "liqueur",
  "hiram walker": "liqueur", "bols": "liqueur", "marie brizard": "liqueur",
  "chambord": "liqueur", "domaine de canton": "liqueur", "licor 43": "liqueur",
};

function suggestCategory(name: string, brand: string): string | null {
  // Pad with spaces so word-boundary keywords like " bbn " match at start/end too
  const raw = ` ${name} ${brand} `.toLowerCase();
  // Strip volume suffixes for cleaner matching
  const text = raw.replace(/\b\d+(\.\d+)?\s*(ml|l|oz|cl|fl oz)\b/gi, " ").replace(/\s+/g, " ");

  // 1. Keyword map (mixer/beer first to avoid brand mis-classification)
  for (const { keywords, category } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (text.includes(kw)) return category;
    }
  }

  // 2. Brand map against full text
  for (const [b, cat] of Object.entries(BRAND_MAP)) {
    if (text.includes(b)) return cat;
  }

  return null;
}

interface AutoSuggestion {
  id: string;
  name: string;
  brand: string;
  suggested: string;
  selected: boolean;
  override: string;
}

function AutoCategorizeModal({
  onClose,
  onApply,
  categories,
}: {
  onClose: () => void;
  onApply: (cats: Record<string, string>) => void;
  categories: { value: string; label: string }[];
}) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AutoSuggestion[]>([]);
  const [applying, setApplying] = useState(false);
  const [showNoMatch, setShowNoMatch] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch ALL "other" products by paging through (API max 200/page)
      const allProducts: { id: string; name: string; brand: string }[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(`${API}/admin/products?category=other&limit=200&page=${page}`);
        const json = await res.json();
        const batch: { id: string; name: string; brand: string }[] = json.products ?? [];
        allProducts.push(...batch);
        if (allProducts.length >= (json.total ?? 0) || batch.length < 200) break;
        page++;
      }
      const products = allProducts;

      const suggs: AutoSuggestion[] = products
        .map((p) => {
          const suggested = suggestCategory(p.name, p.brand);
          return { id: p.id, name: p.name, brand: p.brand, suggested: suggested ?? "", selected: !!suggested, override: suggested ?? "other" };
        })
        .sort((a, b) => (a.suggested ? 0 : 1) - (b.suggested ? 0 : 1) || a.name.localeCompare(b.name));

      setSuggestions(suggs);
      setLoading(false);
    }
    load();
  }, []);

  function toggleAll(val: boolean) {
    setSuggestions((s) => s.map((x) => x.suggested ? { ...x, selected: val } : x));
  }

  function toggle(id: string) {
    setSuggestions((s) => s.map((x) => x.id === id ? { ...x, selected: !x.selected } : x));
  }

  function setOverride(id: string, cat: string) {
    setSuggestions((s) => s.map((x) => x.id === id ? { ...x, override: cat, selected: true } : x));
  }

  async function handleApply() {
    setApplying(true);
    const cats: Record<string, string> = {};
    for (const s of suggestions) {
      if (s.selected && s.override && s.override !== "other") {
        cats[s.id] = s.override;
      }
    }
    onApply(cats);
  }

  const matched = suggestions.filter((s) => s.suggested);
  const unmatched = suggestions.filter((s) => !s.suggested);
  const selectedCount = suggestions.filter((s) => s.selected).length;
  const visibleSuggestions = showNoMatch ? suggestions : matched;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Wand2 size={16} className="text-purple-500" /> Auto-Categorize
            </h2>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">
                {matched.length} matched · {unmatched.length} unmatched · {suggestions.length} total "Other" products
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Analyzing products…</div>
          ) : suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No "Other" products found.</div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="sticky top-0 bg-gray-50 border-b px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleAll(true)} className="text-brand-600 font-medium hover:underline">Select all</button>
                  <button onClick={() => toggleAll(false)} className="text-gray-500 hover:underline">Deselect all</button>
                  {unmatched.length > 0 && (
                    <button onClick={() => setShowNoMatch(!showNoMatch)} className="text-gray-400 hover:text-gray-600">
                      {showNoMatch ? "Hide" : "Show"} {unmatched.length} unmatched
                    </button>
                  )}
                </div>
                <span className="text-gray-500">{selectedCount} selected</span>
              </div>

              {/* List */}
              <div className="divide-y">
                {visibleSuggestions.map((s) => (
                  <div key={s.id} className={`flex items-center gap-3 px-5 py-3 ${!s.suggested ? "bg-gray-50 opacity-60" : ""}`}>
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => toggle(s.id)}
                      disabled={!s.suggested}
                      className="rounded accent-brand-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.brand}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.suggested ? (
                        <>
                          <span className="text-xs text-gray-400">→</span>
                          <select
                            value={s.override}
                            onChange={(e) => setOverride(s.id, e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                          >
                            {categories.filter((c: { value: string; label: string }) => c.value !== "other").map((c: { value: string; label: string }) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No match</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && selectedCount > 0 && (
          <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Will update {selectedCount} product{selectedCount > 1 ? "s" : ""}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="border rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors"
              >
                {applying ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> : <Check size={14} />}
                Apply {selectedCount} Change{selectedCount > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
        {!loading && selectedCount === 0 && suggestions.length > 0 && (
          <div className="px-5 py-4 border-t">
            <button onClick={onClose} className="w-full border rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice: number | null;
  volume: string;
  abv: number;
  country: string;
  stockQty: number;
  inStock: boolean;
  featured: boolean;
  active: boolean;
  description: string;
  imageUrl: string | null;
  bundleEligible: boolean;
  couponExcluded: boolean;
  pickupOnly: boolean;
}

const EMPTY: Omit<Product, "id" | "slug"> = {
  name: "", brand: "", category: "whiskey", price: 0, salePrice: null,
  volume: "750ml", abv: 40, country: "USA", stockQty: 0,
  inStock: false, featured: false, active: false, description: "", imageUrl: null, bundleEligible: false,
  couponExcluded: false, pickupOnly: false,
};

const PAGE_SIZE = 50;

async function fetchProductsPage(opts: {
  page: number; q: string; category?: string; stock: string; featured?: boolean; bundle?: boolean;
  couponExcluded?: boolean; pickupOnly?: boolean;
}): Promise<{ products: Product[]; total: number; totalPages: number }> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(opts.page) });
  if (opts.q)        params.set("q", opts.q);
  if (opts.category) params.set("category", opts.category);
  if (opts.stock)    params.set("stock", opts.stock);
  if (opts.featured) params.set("featured", "true");
  if (opts.bundle)   params.set("bundle", "true");
  if (opts.couponExcluded) params.set("couponExcluded", "true");
  if (opts.pickupOnly)     params.set("pickupOnly", "true");
  const res = await fetch(`${API}/admin/products?${params}`);
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  const data = await res.json();
  return {
    products: (data.products ?? data.data ?? []) as Product[],
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
}

async function createProduct(body: Partial<Product>) {
  const res = await fetch(`${API}/admin/products`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Create failed (${res.status})`);
  }
  return res.json();
}

async function updateProduct({ id, ...body }: Partial<Product> & { id: string }) {
  const res = await fetch(`${API}/admin/products/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Save failed (${res.status})`);
  }
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`${API}/admin/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error ?? `Delete failed (${res.status})`);
  }
}

function StatusBadge({ qty }: { qty: number }) {
  if (qty > 0) return <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Active</span>;
  return <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Inactive</span>;
}

interface ProductModalProps {
  product: Partial<Product> | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  saving: boolean;
}

function ProductModal({ product, onClose, onSave, saving, categories }: ProductModalProps & { categories: { value: string; label: string }[] }) {
  const isNew = !product?.id;
  const [form, setForm] = useState<Omit<Product, "id" | "slug">>({
    name: product?.name ?? EMPTY.name,
    brand: product?.brand ?? EMPTY.brand,
    category: product?.category ?? EMPTY.category,
    price: product?.price ?? EMPTY.price,
    salePrice: product?.salePrice ?? EMPTY.salePrice,
    volume: product?.volume ?? EMPTY.volume,
    abv: product?.abv ?? EMPTY.abv,
    country: product?.country ?? EMPTY.country,
    stockQty: product?.stockQty ?? EMPTY.stockQty,
    inStock: product?.inStock ?? EMPTY.inStock,
    featured: product?.featured ?? EMPTY.featured,
    bundleEligible: product?.bundleEligible ?? EMPTY.bundleEligible,
    couponExcluded: product?.couponExcluded ?? EMPTY.couponExcluded,
    pickupOnly: product?.pickupOnly ?? EMPTY.pickupOnly,
    active: product?.active ?? EMPTY.active,
    description: product?.description ?? EMPTY.description,
    imageUrl: product?.imageUrl ?? EMPTY.imageUrl,
  });

  // ── Image upload state ─────────────────────────────────────────────────────
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5 MB.");
      return;
    }
    setUploadError("");
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPendingFile(file);
    setPreviewUrl(url);
  }

  function handleRemoveImage() {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setPendingFile(null);
    setPreviewUrl(null);
    set("imageUrl", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError("");
  }

  // String states for price inputs to allow free typing (e.g., "12." while typing "12.99")
  const [priceText, setPriceText] = useState(
    product?.price != null && product.price > 0 ? String(product.price) : ""
  );
  const [salePriceText, setSalePriceText] = useState(
    product?.salePrice != null ? String(product.salePrice) : ""
  );
  const [priceError, setPriceError] = useState("");
  const [salePriceError, setSalePriceError] = useState("");

  function set(k: keyof typeof form, v: unknown) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function parsePriceText(text: string): number | null {
    const clean = text.trim();
    if (!clean) return null;
    const n = parseFloat(clean);
    if (isNaN(n) || n < 0) return null;
    // Max 2 decimal places
    if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
    return n;
  }

  function handlePriceBlur() {
    const n = parsePriceText(priceText);
    if (priceText.trim() === "") {
      setPriceError("Price is required");
      return;
    }
    if (n === null) {
      setPriceError("Enter a valid price, e.g. 12.99");
      return;
    }
    if (n <= 0) {
      setPriceError("Price must be greater than $0.00");
      return;
    }
    setPriceError("");
    set("price", n);
    setPriceText(String(n));
  }

  function handleSalePriceBlur() {
    if (!salePriceText.trim()) {
      setSalePriceError("");
      set("salePrice", null);
      return;
    }
    const n = parsePriceText(salePriceText);
    if (n === null) {
      setSalePriceError("Enter a valid price, e.g. 9.99");
      return;
    }
    if (n <= 0) {
      setSalePriceError("Sale price must be greater than $0.00");
      return;
    }
    setSalePriceError("");
    set("salePrice", n);
    setSalePriceText(String(n));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = parsePriceText(priceText);
    if (!parsedPrice || parsedPrice <= 0) {
      setPriceError("Price is required and must be a valid amount greater than $0.00");
      return;
    }
    const parsedSalePrice = salePriceText.trim() ? parsePriceText(salePriceText) : null;
    if (salePriceText.trim() && parsedSalePrice === null) {
      setSalePriceError("Enter a valid sale price, e.g. 9.99");
      return;
    }

    // If a new file is pending, upload it first
    let imageUrl: string | null = pendingFile ? null : previewUrl;
    if (pendingFile) {
      setUploading(true);
      setUploadError("");
      try {
        const fd = new FormData();
        fd.append("image", pendingFile);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Upload failed. Please try again.");
          setUploading(false);
          return;
        }
        imageUrl = data.url;
      } catch {
        setUploadError("Network error during upload. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const finalForm = { ...form, price: parsedPrice, salePrice: parsedSalePrice, imageUrl };
    onSave(product?.id ? { id: product.id, ...finalForm } : finalForm);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{isNew ? "Add New Product" : "Edit Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Product Image</label>
            <div className="flex gap-4 items-start">
              {/* Preview box */}
              <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={28} className="text-gray-300" />
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full border rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Upload size={14} />
                  {previewUrl ? "Change Image" : "Upload Image"}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center justify-center gap-2 w-full border border-red-200 rounded-lg py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={13} /> Remove Image
                  </button>
                )}
                <p className="text-xs text-gray-400">JPG, PNG, WEBP · Max 5 MB</p>
                {pendingFile && !uploadError && (
                  <p className="text-xs text-blue-600 font-medium truncate">
                    📎 {pendingFile.name} ({(pendingFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 font-medium">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Jack Daniel's Old No. 7"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none capitalize"
                >
                  {categories.map((c: { value: string; label: string }) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => { setPriceText(e.target.value); setPriceError(""); }}
                  onBlur={handlePriceBlur}
                  placeholder="0.00"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${priceError ? "border-red-400 focus:ring-red-300" : "focus:ring-brand-500"}`}
                />
              </div>
              {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sale Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={salePriceText}
                  onChange={(e) => { setSalePriceText(e.target.value); setSalePriceError(""); }}
                  onBlur={handleSalePriceBlur}
                  placeholder="Optional"
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${salePriceError ? "border-red-400 focus:ring-red-300" : "focus:ring-brand-500"}`}
                />
              </div>
              {salePriceError && <p className="text-xs text-red-500 mt-1">{salePriceError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Qty *</label>
              <input
                required
                type="text" inputMode="decimal"
                min="0"
                value={form.stockQty}
                onChange={(e) => set("stockQty", parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ABV (%)</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0.0"
                  value={form.abv === 0 ? "" : form.abv}
                  onChange={(e) => set("abv", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                  onBlur={(e) => set("abv", parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Product description..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Status info */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-gray-50">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
              <div className="flex items-center gap-1.5">
                <StatusBadge qty={form.stockQty} />
                <span className="text-xs text-gray-400">
                  {form.stockQty > 0 ? "— visible on website" : "— hidden from website (stock = 0)"}
                </span>
              </div>
            </div>
          </div>

          {/* New Arrivals */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-amber-50 border-amber-200">
            <div>
              <p className="text-sm font-semibold text-amber-800">⭐ New Arrivals</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {form.featured
                  ? "Hiển thị trong filter \"New Arrivals\" trên website"
                  : "Bật để hiển thị trong filter \"New Arrivals\""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("featured", !form.featured)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.featured ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.featured ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* Bundle Sale eligibility */}
          <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-purple-50 border-purple-200">
            <div>
              <p className="text-sm font-semibold text-purple-800">📦 Bundle Sale Eligible</p>
              <p className="text-xs text-purple-600 mt-0.5">
                {form.bundleEligible
                  ? "This product participates in Bundle deals (buy 2+, 3+…)"
                  : "Not included in Bundle deals — add to enable"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("bundleEligible", !form.bundleEligible)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.bundleEligible ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                form.bundleEligible ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* Coupon exclusion & Pickup Only — shown side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between rounded-xl border px-4 py-3 bg-red-50 border-red-200">
              <div>
                <p className="text-sm font-semibold text-red-800">🚫 Exclude from Coupon Codes</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {form.couponExcluded
                    ? "Never discounted by coupon codes, even with a valid code applied"
                    : "Bật để loại sản phẩm này khỏi mọi coupon code"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("couponExcluded", !form.couponExcluded)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-2 ${
                  form.couponExcluded ? "bg-red-600" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.couponExcluded ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border px-4 py-3 bg-blue-50 border-blue-200">
              <div>
                <p className="text-sm font-semibold text-blue-800">🏬 Pickup Only</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {form.pickupOnly
                    ? "Blocked for Delivery — only orderable via Pick Up In Store"
                    : "Bật để chỉ cho phép đặt hàng Pick Up In Store"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("pickupOnly", !form.pickupOnly)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-2 ${
                  form.pickupOnly ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.pickupOnly ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {uploading ? (
                <><span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> Uploading…</>
              ) : saving ? (
                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
              ) : (
                <><Check size={16} /> {isNew ? "Add Product" : "Save Changes"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalProduct, setModalProduct] = useState<Partial<Product> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();
  const [pendingCats, setPendingCats] = useState<Record<string, string>>({});
  const [showAutocat, setShowAutocat] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [flashModal, setFlashModal] = useState<{ product: Product; dealId?: string } | null>(null);
  const [flashPrice, setFlashPrice] = useState("");

  // Debounce search — reset page on new search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [catFilter, stockFilter]);

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), ok ? 2500 : 5000);
  }

  const SYNTHETIC_FILTERS = ["__featured", "__bundle", "__coupon_excluded", "__pickup_only"];
  const queryParams = {
    page,
    q: debouncedSearch,
    category: SYNTHETIC_FILTERS.includes(catFilter) ? undefined : catFilter,
    featured: catFilter === "__featured" ? true : undefined,
    bundle:   catFilter === "__bundle"   ? true : undefined,
    couponExcluded: catFilter === "__coupon_excluded" ? true : undefined,
    pickupOnly:     catFilter === "__pickup_only"     ? true : undefined,
    stock: stockFilter,
  };

  const { data: pageData, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-products", queryParams],
    queryFn: () => fetchProductsPage(queryParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: dynamicCats } = useQuery<{ value: string; label: string; emoji: string }[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/categories`);
      const data = await res.json();
      return Array.isArray(data) ? data.map((c: { value: string; label: string; emoji?: string }) => ({ value: c.value, label: `${c.emoji || ""} ${c.label}`.trim(), emoji: c.emoji || "" })) : [];
    },
    staleTime: 60_000,
  });
  const CATEGORIES = dynamicCats && dynamicCats.length > 0 ? dynamicCats : CATEGORIES_FALLBACK;

  // Flash deals — match by slug OR productId
  const { data: flashDeals = [] } = useQuery<{ id: string; slug: string; productId?: string | null; active: boolean }[]>({
    queryKey: ["admin-flash-deals"],
    queryFn: async () => (await fetch(`${API}/admin/flash-deals`)).json(),
    staleTime: 30_000,
  });
  const flashDealBySlug      = new Map(flashDeals.map(d => [d.slug, d.id]));
  const flashDealByProductId = new Map(flashDeals.filter(d => d.productId).map(d => [d.productId!, d.id]));

  const products = pageData?.products ?? [];
  const totalProducts = pageData?.total ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { invalidate(); setShowModal(false); showToast("Product created successfully."); },
    onError: (e: Error) => showToast(e.message, false),
  });
  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => { invalidate(); setShowModal(false); showToast("Changes saved successfully."); },
    onError: (e: Error) => showToast(e.message, false),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { invalidate(); showToast("Product deleted."); },
    onError: (e: Error) => showToast(e.message, false),
  });

  // Batch save all pending category changes via PATCH (surgical field update)
  const saveCatsMutation = useMutation({
    mutationFn: async (cats: Record<string, string>) => {
      const entries = Object.entries(cats);
      await Promise.all(entries.map(async ([id, category]) => {
        const res = await fetch(`${API}/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as Record<string, string>).error ?? `Save failed (${res.status})`);
        }
        return res.json();
      }));
      return entries;
    },
    onSuccess: (n) => {
      setPendingCats({});
      invalidate();
      showToast(`${n.length} categor${n.length === 1 ? "y" : "ies"} updated successfully.`);
    },
    onError: (e: Error) => showToast(e.message, false),
  });

  function openAdd() { setModalProduct(null); setShowModal(true); }
  function openEdit(p: Product) { setModalProduct(p); setShowModal(true); }

  function handleSave(data: Partial<Product>) {
    if (data.id) {
      updateMutation.mutate(data as Partial<Product> & { id: string });
    } else {
      createMutation.mutate(data);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Product Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoading ? "Loading…" : (
                debouncedSearch || catFilter || stockFilter
                  ? <>{totalProducts} results</>
                  : <>{totalProducts} products</>
              )}
            </p>
          </div>

          {/* Primary actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowCategories(true)}
              className="flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors w-full sm:w-auto"
            >
              <Tag size={16} /> Categories
            </button>
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm w-full sm:w-auto"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Secondary actions row */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(pendingCats).length > 0 && (
            <button
              onClick={() => saveCatsMutation.mutate(pendingCats)}
              disabled={saveCatsMutation.isPending}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-3 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm"
            >
              <Check size={13} />
              {saveCatsMutation.isPending ? "Saving…" : `Save ${Object.keys(pendingCats).length} Change${Object.keys(pendingCats).length > 1 ? "s" : ""}`}
            </button>
          )}
          <button
            onClick={() => setShowAutocat(true)}
            className="flex items-center gap-1.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg font-medium text-xs transition-colors"
          >
            <Wand2 size={13} /> Auto-Categorize
          </button>
          <button
            onClick={async () => { setExporting(true); await exportProductsCSV(); setExporting(false); }}
            disabled={exporting}
            className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-600 px-3 py-2 rounded-lg font-medium text-xs transition-colors"
          >
            <Download size={13} /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg font-medium text-xs transition-colors"
          >
            <Upload size={13} /> Import
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border mb-4 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or brand…"
            className="w-full pl-8 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none pr-7 capitalize"
            >
              <option value="">All Categories</option>
              <option value="__featured">⭐ New Arrivals</option>
              <option value="__bundle">📦 Bundle Eligible</option>
              <option value="__coupon_excluded">🚫 Coupon Excluded</option>
              <option value="__pickup_only">🏬 Pickup Only</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none pr-7"
            >
              <option value="">All Stock</option>
              <option value="in">In Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isError ? (
          <div className="p-12 text-center text-red-500">
            <p className="font-medium mb-2">⚠️ Failed to load products.</p>
            <button onClick={() => refetch()} className="text-sm underline hover:text-red-700">Retry</button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin border-2 border-brand-500 border-t-transparent rounded-full w-8 h-8 mx-auto mb-2" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={36} className="mx-auto mb-2 opacity-30" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="divide-y">
            {(products as Product[]).map((p) => (
              <div key={p.id} className={`transition-colors hover:bg-gray-50/50 ${p.stockQty <= 0 ? "opacity-60" : ""}`}>
                {/* Top row: image + info + price + status */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  {/* Image */}
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-contain border bg-gray-50 p-0.5 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Package size={16} className="text-gray-400" />
                    </div>
                  )}
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm leading-tight text-gray-900 truncate">{p.name}</p>
                      {p.featured && <Star size={11} className="text-yellow-500 fill-yellow-400 shrink-0" />}
                      {p.bundleEligible && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold shrink-0">BUNDLE</span>}
                      {p.couponExcluded && <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold shrink-0">NO COUPON</span>}
                      {p.pickupOnly && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold shrink-0">PICKUP ONLY</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>
                  </div>
                  {/* Price + status */}
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-sm text-gray-900">${Number(p.price).toFixed(2)}</p>
                    {p.salePrice ? (
                      <p className="text-[11px] text-red-500 font-medium">${Number(p.salePrice).toFixed(2)} sale</p>
                    ) : (
                      <StatusBadge qty={p.stockQty} />
                    )}
                  </div>
                </div>

                {/* Bottom action footer */}
                <div className="flex items-center gap-2 px-4 pb-3 pt-0">
                  {/* Category dropdown */}
                  <div className="relative flex-1">
                    <select
                      value={pendingCats[p.id] ?? p.category}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        if (newCat === p.category) {
                          setPendingCats(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                        } else {
                          setPendingCats(prev => ({ ...prev, [p.id]: newCat }));
                        }
                      }}
                      className={`w-full text-xs rounded-lg pl-2 pr-6 py-1.5 appearance-none capitalize focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer transition-colors ${
                        pendingCats[p.id]
                          ? "border border-amber-400 bg-amber-50 text-amber-800 font-semibold"
                          : "border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {/* Stock badge */}
                  <div className="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg px-2.5 py-1.5 border border-gray-200">
                    <Package size={11} className="text-gray-400" />
                    {p.stockQty}
                  </div>
                  {/* Divider */}
                  <div className="w-px h-5 bg-gray-200 shrink-0" />
                  {/* Flash Deal toggle */}
                  {(() => {
                    const dealId = flashDealBySlug.get(p.slug) ?? flashDealByProductId.get(p.id);
                    return (
                      <button
                        onClick={() => {
                          if (dealId) {
                            if (confirm(`Remove "${p.name}" from Flash Deal?`)) {
                              fetch(`${API}/admin/flash-deals/${dealId}`, { method: "DELETE" })
                                .then(() => qc.invalidateQueries({ queryKey: ["admin-flash-deals"] }));
                            }
                          } else {
                            setFlashPrice(p.salePrice ? String(p.salePrice) : "");
                            setFlashModal({ product: p });
                          }
                        }}
                        title={dealId ? "Remove Flash Deal" : "Add to Flash Deal"}
                        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                          dealId
                            ? "bg-amber-50 border-amber-400 text-amber-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            : "border-gray-200 text-gray-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        <Zap size={11} className={dealId ? "fill-amber-400" : ""} />
                        {dealId ? "Deal" : "Flash"}
                      </button>
                    );
                  })()}
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)} of {totalProducts}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {/* Page number pills — show at most 5 around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const mid = Math.min(Math.max(page, 3), totalPages - 2);
                return mid - 2 + i;
              }).filter(n => n >= 1 && n <= totalPages).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg border transition-colors ${
                    n === page
                      ? "bg-brand-500 text-white border-brand-500"
                      : "border-gray-200 text-gray-600 hover:bg-white"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual add/edit modal (existing — unchanged) */}
      {showModal && (
        <ProductModal
          product={modalProduct}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
          categories={CATEGORIES}
        />
      )}

      {/* Bulk import modal (new) */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            invalidate();
          }}
        />
      )}

      {/* Categories slide-over */}
      {showCategories && <CategoriesModal onClose={() => setShowCategories(false)} />}

      {/* Flash Deal mini modal */}
      {flashModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFlashModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-amber-500 fill-amber-400" />
                <h3 className="font-bold text-gray-900">Add to Flash Deal</h3>
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1 truncate">{flashModal.product.name}</p>
              <p className="text-xs text-gray-400 mb-4">Regular price: <strong>${Number(flashModal.product.price).toFixed(2)}</strong></p>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Flash Deal Price *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={flashPrice}
                onChange={e => setFlashPrice(e.target.value)}
                placeholder={`e.g. ${(flashModal.product.price * 0.8).toFixed(2)}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const p = flashModal.product;
                    const salePrice = parseFloat(flashPrice);
                    if (!salePrice || salePrice <= 0) return;
                    // If an existing deal has same productId or slug → update it, don't duplicate
                    const existingId = flashDealByProductId.get(p.id) ?? flashDealBySlug.get(p.slug);
                    if (existingId) {
                      await fetch(`${API}/admin/flash-deals/${existingId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ salePrice, slug: p.slug, productId: p.id, active: true }),
                      });
                    } else {
                      await fetch(`${API}/admin/flash-deals`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: p.name, brand: p.brand ?? "", slug: p.slug,
                          price: p.price, salePrice,
                          imageUrl: p.imageUrl ?? null,
                          volume: p.volume ?? "", stockQty: p.stockQty, maxStock: p.stockQty,
                          active: true, startAt: null, endsAt: null, productId: p.id,
                        }),
                      });
                    }
                    qc.invalidateQueries({ queryKey: ["admin-flash-deals"] });
                    showToast(`"${p.name}" added to Flash Deal ⚡`);
                    setFlashModal(null);
                  }}
                  disabled={!flashPrice || parseFloat(flashPrice) <= 0}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-sm py-2 rounded-xl transition-colors"
                >
                  ⚡ Add to Flash Deal
                </button>
                <button onClick={() => setFlashModal(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Auto-categorize modal */}
      {showAutocat && (
        <AutoCategorizeModal
          onClose={() => setShowAutocat(false)}
          categories={CATEGORIES}
          onApply={async (cats) => {
            setShowAutocat(false);
            await saveCatsMutation.mutateAsync(cats);
            showToast(`${Object.keys(cats).length} products re-categorized.`);
          }}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-xs ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}>
          <CheckCircle2 size={16} className={`shrink-0 ${toast.ok ? "text-green-400" : "text-white"}`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
