'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Breadcrumb, Pagination } from '@/components/ui/pagination';
import { DataTable, type Column } from '@/components/ui/table';
import { Badge, StockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import { mockProducts } from '@/lib/mock-data';
import { formatPKR } from '@/lib/utils';

interface Row extends Record<string, unknown> {
  sku: string;
  name: string;
  brand: string;
  stock: string;
  price: string;
}

const rows: Row[] = mockProducts.slice(0, 5).map((product) => ({
  sku: product.sku,
  name: product.name,
  brand: product.brand,
  stock: product.stockStatus,
  price: product.price ? formatPKR(product.price) : 'On request',
}));

const columns: Column<Row>[] = [
  { key: 'sku', header: 'SKU', sortable: true },
  { key: 'name', header: 'Product', sortable: true },
  { key: 'brand', header: 'Brand', sortable: true },
  {
    key: 'stock',
    header: 'Stock',
    align: 'center',
    render: (row) => <StockBadge status={row.stock as 'in_stock'} />,
  },
  { key: 'price', header: 'Price', sortable: true, align: 'right' },
];

export function DataSection(): JSX.Element {
  const [page, setPage] = useState(4);

  return (
    <section id="data" className="scroll-mt-24">
      <SectionHeading title="Data display" />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Cards</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card interactive>
              <CardHeader>
                <CardTitle>Interactive card</CardTitle>
                <CardDescription>Lifts on hover — used for product tiles.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Body content sits here with the standard 20 px padding.
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="cta">
                  Action
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Static card</CardTitle>
                <CardDescription>No hover treatment.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Used for panels and form sections.
              </CardContent>
            </Card>

            <Card className="bg-brand-gradient border-0 text-white">
              <CardHeader>
                <CardTitle className="text-white">Gradient panel</CardTitle>
                <CardDescription className="text-white/70">
                  #0F1B4C → #1B2A6B, for promos and CTAs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Sortable table
          </p>
          <DataTable columns={columns} rows={rows} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-6">
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Tabs</p>
            <Tabs defaultValue="specs">
              <TabsList>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="datasheet">Datasheet</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="specs">
                <dl className="divide-y divide-border text-sm">
                  {[
                    ['Rated Current (In)', '100 A'],
                    ['Poles', '3P'],
                    ['Breaking Capacity', '36 kA'],
                  ].map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 py-2">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </TabsContent>
              <TabsContent value="datasheet" className="text-sm text-muted-foreground">
                PDF datasheets are attached per product by the admin.
              </TabsContent>
              <TabsContent value="reviews" className="text-sm text-muted-foreground">
                Approved customer reviews appear here.
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-lg border border-border bg-white p-6">
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Accordion
            </p>
            <Accordion type="single" collapsible defaultValue="a">
              <AccordionItem value="a">
                <AccordionTrigger>Do you deliver outside Lahore?</AccordionTrigger>
                <AccordionContent>
                  Yes — Punjab in 2–4 working days and the rest of Pakistan in 3–6, with free
                  delivery above the thresholds set in Settings.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Can I get trade pricing?</AccordionTrigger>
                <AccordionContent>
                  Add items to your inquiry list and send the request — we reply with a
                  consolidated quotation within one working day.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="c">
                <AccordionTrigger>Are the brands genuine?</AccordionTrigger>
                <AccordionContent>
                  We are an authorised stockist for all twelve brands listed in the footer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <div className="space-y-5 rounded-lg border border-border bg-white p-6">
          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Breadcrumb
            </p>
            <Breadcrumb
              items={[
                { label: 'Switchgear & Protection', href: '/category/switchgear-protection' },
                { label: 'Circuit Breakers', href: '/category/circuit-breakers' },
                { label: 'MCCB' },
              ]}
            />
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Pagination
            </p>
            <Pagination page={page} totalPages={12} onPageChange={setPage} className="justify-start" />
            <p className="mt-2 text-xs text-muted-foreground">
              Current page: <Badge variant="outline">{page}</Badge> of 12
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
