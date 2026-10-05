# Shooting your own product photos — the 30-minute version

Real photos of your real stock will always beat stock photos: customers can see the exact
box, seal, and expiry style they'll receive. The shop's design already expects this —
products without a photo show a tinted kanji card (活, 温, 急…), so nothing ever looks
broken while a photo is missing.

## The recipe (any phone, no equipment)

1. **Background:** one sheet of cream/warm-white paper (the site's background is `#F6F1E7` —
   an A4 sheet of off-white or light cream paper is close enough). Curl it up against
   something so product and background blend with no visible horizon line.
2. **Light:** face a window. Product gets the window light; you put your back to it.
   No flash — flash flattens the box and yellows the paper.
3. **Framing:** 4:5 or square, product filling ~70% of the frame, label facing the camera.
   Wipe the box. Turn off cluttered backgrounds.
4. **Consistency beats beauty:** all 20 products shot the same way — same paper, same
   window, same angle — reads as a real, considered shop. One afternoon, one phone.

## Putting each photo into the shop

1. Save the photo as `prisma/photos/<product-id>.jpg` (ids are in `docs/catalogue.json`
   — `vitc`, `bp`, `faid`, …). Any size around 1000×1250 is plenty; compress to < 200 KB
   if you can (tinypng.com is free).
2. Host the file somewhere reachable, or (simplest while local) put it in
   `public/products/<product-id>.jpg` and set the product's `img` in
   `docs/catalogue.json` to `/products/<product-id>.jpg` (note the leading slash).
3. Run `npm run db:seed`. Refresh the shop — the photo replaces the kanji card.
4. If a photo ever looks wrong or a file breaks, the kanji card takes over
   automatically — a product never shows a broken image.

## Which products need photos most

Everything except these six already shows a photo: `vitc`, `multi`, `iron`, `bp`,
`oxi`, `aloe`. Priority for your own shots: the exact brands on your shelf —
**Johnson's** (baby lotion, shampoo, wipes), **Forever Living** (sanitizer, aloe
products), **Dettol/Savlon** (antiseptic), your thermometer and glucometer brands,
and the face masks box. Customers look for the box they'll actually receive, so
branded, nurse-checked photos convert better than any generic stock image.

> Note: stock photos of branded products (Getty and similar) are watermarked or
> licensed and can't just be hotlinked — photographing your own stock is both
> the honest option and the better-looking one.

> If any photo shows a person, keep it consistent with the shop's community —
> Ghanaian, Black African people, the faces your customers recognise as their own.
