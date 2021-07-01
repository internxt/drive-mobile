import React from 'react'
import { Text, View, TextInput, TouchableOpacity } from 'react-native'
import { tailwind, getColor } from '../../tailwind'
import Back from '../../../assets/icons/photos/back-blue.svg'
import FilterButton from './FilterButton'
import Lens from '../../../assets/icons/photos/lens.svg';
import { normalize } from '../../helpers'
import { store } from '../../store'
import { layoutActions } from '../../redux/actions'
import strings from '../../../assets/lang/strings'
import { FilterTypes } from '../../library/interfaces/photos'

interface HeaderProps {
  title: string
  setHeaderTitle: React.Dispatch<React.SetStateAction<string>>
  isAlbumSelected: boolean
  setIsAlbumSelected: React.Dispatch<React.SetStateAction<boolean>>
  selectedFilter: FilterTypes
  handleFilterSelection: (filterName: string) => void
  searchString: string
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
  setSearchString: React.Dispatch<React.SetStateAction<string>>
}

const Header = ({
  title,
  setHeaderTitle,
  isAlbumSelected,
  setIsAlbumSelected,
  selectedFilter,
  handleFilterSelection,
  searchString,
  setAlbumTitle,
  setSearchString
}: HeaderProps): JSX.Element => {

  return (
    <View style={tailwind('flex-col items-center')}>
      <View style={tailwind('flex-row items-center mt-4')}>
        {title === 'Albums' ?
          <View style={tailwind('w-1/5 items-start justify-center')}>
            <TouchableOpacity style={tailwind('w-12 pl-2')}
              onPress={() => {
                if (!isAlbumSelected) {
                  setHeaderTitle('INTERNXT PHOTOS')
                }
                setIsAlbumSelected(false)
              }}
            >
              <Back width={25} height={25} />
            </TouchableOpacity>
          </View>
          :
          <View style={tailwind('w-1/5')}></View>
        }

        <Text style={[tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular'), { fontSize: normalize(16) }]}>
          {title}
        </Text>

        {
          title === 'INTERNXT PHOTOS' ?
            <View style={tailwind('w-1/5 justify-center items-end')} />
            :
            <TouchableOpacity style={tailwind('w-1/5 h-8 items-center justify-center')} onPress={() => {
              setAlbumTitle('')
              store.dispatch(layoutActions.openCreateAlbumModal())
            }}>
              <Text style={[tailwind('w-24 text-blue-60 z-10'), { fontSize: normalize(15) }]}>
                {strings.screens.photos.screens.photos.add_album}
              </Text>
            </TouchableOpacity>
        }
      </View>

      {title === 'INTERNXT PHOTOS' ?
        <View style={tailwind('flex-row mt-3 items-center justify-center')}>
          <FilterButton
            width='w-2/4' corners='rounded-l'
            text={strings.screens.photos.screens.photos.download_filter}
            filter='download'
            handleFilterSelection={handleFilterSelection}
            activeFilter={selectedFilter}
          />

          <FilterButton
            width='w-2/4' corners='rounded-r'
            text={strings.screens.photos.screens.photos.upload_filter}
            filter='upload'
            handleFilterSelection={handleFilterSelection}
            activeFilter={selectedFilter}
          />
        </View>
        :
        !isAlbumSelected ?
          <View style={tailwind('flex-row w-full mt-3 items-center justify-center relative')}>
            <View style={tailwind('absolute left-2 z-10')}>
              <Lens width={normalize(16)} height={normalize(16)} />
            </View>

            <TextInput
              style={[tailwind('w-full h-full bg-white text-sm font-averta-regular pl-9 pb-1 rounded-md'), { fontSize: normalize(12) }]}
              placeholderTextColor={getColor('gray-30')}
              placeholder={strings.screens.photos.screens.photos.search_input}
              onChangeText={value => setSearchString(value)}
              value={searchString}
              autoCapitalize='none'
              autoCorrect={false}
            />
          </View>
          :
          null
      }
    </View>
  )
}

export default React.memo(Header);