import { View } from 'react-native';

const GalleryYearsView = (): JSX.Element => {
  return <View></View>;
  /*  const dispatch = useAppDispatch();
  const { years } = useAppSelector((state) => state.photos);
  const yearsList = years.map((data) => <GalleryYear key={data.year.toString()} {...data} />);

  useEffect(() => {
    dispatch(photosThunks.loadYearsThunk());
  }, []);

  return <ScrollView style={tailwind('px-5')}>{yearsList}</ScrollView>; */
};

export default GalleryYearsView;
