<?php
/* Duplicate probashiinfo posts → the URL with more Search Console clicks.
   Generated from generator/data/probashi_wp_redirects.json.
   These URLs are WordPress posts. This file does nothing until it is upserted
   as a Code Snippet (workflow probashi-snippets.yml, upsert_file=probashiinfo-redirects.php).
   Dated BMET reports and daily taka-rate posts are intentionally not in the map. */
if (!defined('ABSPATH')) { return; }
add_action('template_redirect', function () {
	$map = array(
	'iureaap-oyaark-bhisaa-2026-5-deshe-srbnimn-betn-o-khrcer-gaaidd' => 'iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd',
	'maalyeshiyaa-oyaark-bhisaa-2026-caakri-chaaddaa-yaaoyaar-5tti-shj-upaa' => 'maalyeshiyaa-oyaark-bhisaa-2026-khrc-betn-o-aabedn',
	'maalyeshiyaa-bhisaa-cek-2026-3-dhaape-paaspeaartt-diye-sttyaattaas-dek' => 'maalyeshiyaa-bhisaa-cek-2026-paaspeaartt-naambaar-diye-shj-upaay',
	'how-to-check-saudi-arabia-visa' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'saudi-visa-check-online-2026' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'se-di-bhisaa-cek-2026-3-minitte-paaspeaartt-sttyaattaas' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'se-di-bhisaa-cek-2026-4-dhaape-sttyaattaas-o-phi-yaacaai' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'se-di-bhisaa-cek-2026-paaspeaartt-naambaar-diye-3-dhaape-anlaaine-stty' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'se-di-bhisaa-cek-2026-paaspeaartt-naambaar-diye-3-dhaape-yaacaai' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'se-di-bhisaa-cek-2026-paaspeaartte-3-dhaape-shj' => 'se-di-bhisaa-cek-2026-paaspeaartt-diye-shj-niym',
	'maldives-work-permit-cost-2026' => 'maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd',
	'maldives-work-permit-cost-2026-2' => 'maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd',
	'maldives-work-permit-fee-2026' => 'maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd',
	'maldives-work-visa-cost-2026' => 'maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd',
	'reaamaaniyaa-oyaark-bhisaa-2026-betn-khrc-o-shj-gaaidd' => 'reaamaaniyaa-oyaark-bhisaa-2026-shj-pth-o-betn',
	'aami-prbaasii-ayaap-2026-smaartt-kaardd-prshikssnn-o-sebaar-smpuurnn-g' => 'aami-prbaasii-ayaap-ddaaunleaadd-2026-rejisttreshn-o-saarttiphikett-de',
	'prbaasii-klyaann-byaank-leaan-2026-smpuurnn-gaaidd-o-shrtaablii' => 'prbaasii-klyaann-byaank-leaan-2026-shj-shrte-rnn-paaoyaar-smpuurnn-gaa',
	'prbaasii-klyaann-byaank-leaan-aabedn-2026-3-dhaape-ghre-bsei' => 'prbaasii-klyaann-byaank-leaan-2026-shj-shrte-rnn-paaoyaar-smpuurnn-gaa',
	'kaataar-bhisaa-cek-2026-3-dhaape-shj-anlaain-yaacaai' => 'kaataar-bhisaa-cek-2026-paaspeaartt-naambaar-diye-anlaaine-shj-gaaidd',
	'malaysia-visa-check-2026-2' => 'malaysia-visa-check-2026',
	'malaysia-visa-check-2026-3' => 'malaysia-visa-check-2026',
	'malaysia-visa-check-online-2026-saaler-seraa-3-upaay' => 'malaysia-visa-check-2026',
	'canada-work-permit-2026' => 'canada-work-permit-visa-2026-cost-lmia',
	'phri-oyaark-bhisaa-2026-iureaaper-5-deshe-binaa-khrce-caakrir-anumti' => 'phri-oyaark-bhisaa-2026-iureaape-binaa-khrce-kaajer-anumti-paaoyaar-up',
	'singapore-work-permit-2026' => 'singapore-work-permit-visa-2026',
	'singapore-work-permit-2026-cost-salary' => 'singapore-work-permit-visa-2026',
	'bideshe-caakri-2026-seraa-desh-betn-o-shj-bhisaa-gaaidd' => 'bideshe-caakri-2026-seraa-desh-betn-o-shj-oyaark-bhisaa',
	'bideshe-caakri-2026-smpuurnn-gaaidd-o-haalnaagaad-tthy' => 'bideshe-caakri-2026-seraa-desh-betn-o-shj-oyaark-bhisaa',
	'canada-express-entry-2025-bangla-guide' => 'canada-express-entry-2025-bangla-complete-guide',
	'dubaai-theke-iureaap-7-shj-desh-khrc-12-22-haajaar-aed-2026' => 'dubaai-theke-iureaap-oyaark-bhisaa-2026-5tti-gntby-o-khrc',
	'europe-work-permit-2026' => 'europe-work-permit-visa-2026-2',
	'europe-work-permit-visa-2026' => 'europe-work-permit-visa-2026-2',
	'remittyaans-paatthaaneaar-upaay-2026-5-shj-o-sstaa-maadhym' => 'remittyaans-paatthaaneaar-upaay-2026-seraa-5-cyaanel-o-khrc',
	'romania-work-permit-2026' => 'romania-work-permit',
	'singgaapur-oyaark-paarmitt-2026-phi-14500-ttaakaa-lebhi-500-1200' => 'singgaapur-oyaark-paarmitt-2026-phi-26000-ttaakaa-gaaidd',
	);
	$path = rawurldecode(trim((string) wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
	if (isset($map[$path])) {
		wp_redirect(home_url('/' . $map[$path] . '/'), 301);
		exit;
	}
}, 0);
