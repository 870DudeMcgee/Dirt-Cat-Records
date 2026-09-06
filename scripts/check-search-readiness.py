#!/usr/bin/env python3
"""Audit the complete HTML inventory, sitemap, crawl links and optional production responses."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'https://www.dirtcatrecords.com/'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.links=[]; self.resources=[]; self.ids=set(); self.meta={}; self.canonicals=[]
        self.h1=0; self.titles=[]; self.text=[]; self.skip=0; self.in_title=False
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ('script','style'): self.skip+=1
        if tag=='title': self.in_title=True
        if tag=='h1': self.h1+=1
        if 'id' in a: self.ids.add(a['id'])
        if tag=='a' and 'href' in a: self.links.append(a['href'])
        if tag=='meta': self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical': self.canonicals.append(a.get('href'))
        if tag in ('img','script','audio','source') and a.get('src'): self.resources.append(a['src'])
        if tag=='link' and a.get('rel') in ('stylesheet','icon','shortcut icon'): self.resources.append(a.get('href',''))
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if tag=='title': self.in_title=False
    def handle_data(self,data):
        if self.in_title: self.titles.append(data.strip())
        if not self.skip: self.text.extend(data.split())


def main():
    cli=argparse.ArgumentParser(); cli.add_argument('--live',action='store_true'); args=cli.parse_args()
    pages={('/' if f.name=='index.html' else '/'+f.name):Page(f.read_text()) for f in ROOT.glob('*.html')}
    locations=[x.text for x in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    expected={urljoin(ORIGIN,p) for p,page in pages.items() if 'noindex' not in page.meta.get('robots','')}
    assert len(locations)==len(set(locations)), 'Duplicate sitemap URLs'
    assert set(locations)==expected, 'Sitemap must include every indexable page and no private page'
    assert 'Sitemap: '+urljoin(ORIGIN,'sitemap.xml') in (ROOT/'robots.txt').read_text()
    config=json.loads((ROOT/'vercel.json').read_text())
    assert {'source':'/index.html','destination':'/','permanent':True} in config['redirects']
    titles=set(); descriptions=set(); reachable={'/'}
    for path,page in sorted(pages.items()):
        canonical=urljoin(ORIGIN,path)
        assert page.canonicals==[canonical], (path,'canonical')
        assert page.h1==1 and len(page.titles)==1, (path,'title or H1')
        assert page.titles[0] not in titles, (path,'duplicate title')
        titles.add(page.titles[0])
        private='noindex' in page.meta.get('robots','')
        if not private:
            description=page.meta.get('description','')
            assert description and description not in descriptions, (path,'description')
            descriptions.add(description)
            assert page.meta.get('og:url')==canonical, (path,'share URL')
            assert len(page.text)>40, (path,'little static content')
        for link in page.links+page.resources:
            u=urlsplit(urljoin(canonical,link))
            if u.netloc!=urlsplit(ORIGIN).netloc: continue
            assert u.path!='/index.html', (path,'links to duplicate homepage')
            local=ROOT/('index.html' if u.path=='/' else unquote(u.path.lstrip('/')))
            assert local.is_file(), (path,'missing local target',link)
            if link in page.links and u.fragment and u.path in pages:
                assert unquote(u.fragment) in pages[u.path].ids, (path,'missing fragment',link)
        print(f'{path}: canonical OK, '+('noindex' if private else 'indexable')+f', {len(page.text)} static words, {len(page.links)} links')
    while True:
        new={urlsplit(urljoin(ORIGIN,link)).path for p in reachable for link in pages[p].links if urlsplit(urljoin(ORIGIN,link)).netloc==urlsplit(ORIGIN).netloc} & pages.keys()
        if new <= reachable: break
        reachable|=new
    assert {urlsplit(url).path for url in locations} <= reachable, 'Orphan sitemap page'
    if args.live:
        for path,page in sorted(pages.items()):
            with urlopen(Request(urljoin(ORIGIN,path),headers={'User-Agent':'DirtCat-SEO-Audit/1.0'}),timeout=30) as response:
                live=Page(response.read().decode())
                assert response.status==200,(path,response.status)
                assert live.canonicals==page.canonicals,(path,'live canonical')
                assert ('noindex' in live.meta.get('robots',''))==('noindex' in page.meta.get('robots','')),(path,'live robots')
                assert not response.headers.get('X-Robots-Tag') or 'noindex' not in response.headers['X-Robots-Tag'].lower() or 'noindex' in page.meta.get('robots',''),(path,'header blocks indexing')
                print(f'LIVE {path}: HTTP 200, canonical and indexing policy OK')
        with urlopen(urljoin(ORIGIN,'seo-audit-page-that-does-not-exist'),timeout=30) as response:
            raise AssertionError(f'Missing page returned {response.status}, expected 404')
    print(f'PASS: {len(pages)} HTML pages; {len(locations)} indexable sitemap pages; all local targets and fragments exist; all sitemap pages reachable from home.')

if __name__=='__main__':
    from urllib.error import HTTPError
    try: main()
    except HTTPError as error:
        if error.code==404 and 'seo-audit-page-that-does-not-exist' in error.url:
            print('PASS: production missing page returns HTTP 404; full live inventory passed.')
        else: raise
