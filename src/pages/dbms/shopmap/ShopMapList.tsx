
import './ShopMapList.css';

interface ShopMap {
  no: number;
  sno: number;
  fname: string;
  fsaved: string;
  cdate: string;
}

interface Shop {
  no: number;
  mno: number;
  title: string;
}

interface ShopMapRow extends ShopMap {
  mno?: number;
  shopTitle?: string;
}

const PAGE_SIZE = 6;

export default function ShopMapList() {


  return (
    <div>0</div>
  );
}