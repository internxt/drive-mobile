/* eslint-disable quotes */
/* eslint-disable max-len */
import LocalizedStrings from 'react-native-localization';

const strings = new LocalizedStrings({
  en_US: {
    generic: {
      loading: 'Loading',
      cancel: 'Cancel',
      security: 'Security',
      create: 'Create',
      creating: 'Creating...',
      rename: 'Rename',
      close: 'Close',
      upload: 'Upload',
      delete: 'Delete',
      settings: 'Settings',
    },
    tabs: {
      home: 'Home',
      drive: 'Drive',
      create: 'Create',
      photos: 'Photos',
      menu: 'Menu',
    },
    screens: {
      home: {
        title: 'Home',
      },
      change_password: {
        confirm: 'Delete account',
        title: 'Change password',
        warning:
          'Remember that if you change your password, you will be signed out in all your devices. You will need these credentials for logining in again.',
      },
      recover_password: {
        title: 'Recover password',
        warning: 'You can use this device to set a new password and recover your account',
      },
      login_screen: {
        title: 'Login in to Internxt',
        forgot: 'Forgot your password?',
        no_register: "Don't have account?",
        register: 'Get started',
        back: 'Back to login',
      },
      register_screen: {
        first:
          '{0} is a {1} cloud storage service. A {2} place for all your files. Welcome to the {3}. Welcome to {4}.',
        second:
          'Files are {0} on your device. There is {1} we nor any other third-party can access them. {2}, as it should have always been.',
        third:
          'Access Internxt from {7}, {8} or {9}. Start using Internxt today with {10} on us. {11} when needed, free for a month, cancel anytime.',
        bold_first: ['Internxt', 'different', 'better', 'revolution', 'Internxt'],
        bold_second: ['encrypted', 'no way', 'Privacy'],
        bold_third: ['Desktop', 'Web', 'Mobile', '10 GB', 'Upgrade your storage'],
        security_title: 'Internxt Security',
        security_subtitle:
          "Internxt uses your password to encrypt and decrypt your files. Due to the secure nature of Internxt, we don't know your password. That means that if you ever forget it, your files are gone forever. With us, you're the only owner of your files.",
        suggestion_1: 'Store your password. Keep it safe and secure.',
        suggestion_2: 'Keep an offline backup of your password.',
        create_account_title: 'Create an Internxt account',
      },
      forgot_password: {
        title: 'Internxt security',
        subtitle_1:
          "As specified during the sign up process, Internxt Drive encrypts your files, and only you have access to those. We never know your password, and thus, that way, only you can decrypt your account. For that reason, if you forget your password, we can't restore your account. What we can do, however, is to",
        bold: ' delete your account and erase all its files',
        subtitle_2:
          ', so that you can sign up again. Please, if you still want to procede, enter your email below so that we can process the account removal.',
      },
      deactivation_screen: {
        title: 'Deactivation email',
        subtitle_1:
          'Please check your email and follow the instructions to deactivate your account so you can start using Internxt again.',
        subtitle_2:
          'Once you deactivate your account, you will be able to sign up using the same email address. Please store your password somewhere safe. With Internxt Drive, only you are the true owner of your files on the cloud. With great power there must also come great responsibility.',
      },
      drive: {
        title: 'Drive',
        sort: {
          Name_Asc: 'Name',
          Date_Added: 'Upload date',
          Size_Asc: 'Size',
          File_Type_Asc: 'File type',
        },
        emptyRoot: {
          title: 'Your drive is empty',
          message: 'Try uploading a file or creating a folder',
        },
        emptyFolder: {
          title: 'This folder is empty',
          message: 'Try uploading a file or creating a folder',
        },
        searchInThisFolder: 'Search in this folder',
      },
      recents: {
        title: 'Recents',
        empty: {
          title: 'No recents files',
          message: 'Try interacting with your files',
        },
      },
      shared: {
        title: 'Shared',
        empty: {
          title: 'No shared items',
          message: 'Your shared items will show up here',
        },
      },
      storage: {
        title: 'Storage',
        currentPlan: 'Current plan',
        usage: 'Usage',
        space: {
          title: 'Storage space',
          used: {
            used: 'Used',
            of: 'of',
          },
          legend: {
            used: 'Used space',
            unused: 'Unused space',
          },
        },
        plans: {
          title: 'Storage plans',
          title_2: 'Payment length',
          current_plan: 'You are subscribed to the',
          pay: 'Pay per',
          pre_pay: 'Prepay',
          month: 'month',
          months: 'months',
        },
      },
      create_folder: {
        input: 'Enter folder name',
        title: 'New folder',
        confirm: 'Create',
      },
      billing: {
        title: 'Billing',
      },
      gallery: {
        title: 'Gallery',
        nPhotosSelected: '{0} selected',
        groupBy: {
          years: 'Years',
          months: 'Months',
          days: 'Days',
          all: 'All',
        },
      },
    },
    components: {
      buttons: {
        sign_in: 'Sign in',
        create: 'Create an account',
        next: 'Next',
        get_started: 'Get started',
        continue: 'Continue',
        back: 'Back',
        creating_button: 'Creating...',
        deactivation: 'Re-send deactivation email',
        sing_up: 'Sign up',
        descrypting: 'Decrypting...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        move: 'Move',
        share: 'Share',
        upgrade: 'Upgrade',
        upgradeNow: 'Upgrade now',
        uploadFiles: 'Upload files',
        uploadFromCameraRoll: 'Upload from camera roll',
        takeAPhotoAnUpload: 'Take a photo an upload',
        newFolder: 'New folder',
        changePlan: 'Change plan',
        select: 'Select',
        selectAll: 'Select all',
      },
      inputs: {
        email: 'Email address',
        newPassword: 'New password',
        password: 'Password',
        confirm_password: 'Confirm password',
        first_name: 'First name',
        last_name: 'Last name',
        searchInRecents: 'Search in recents',
        searchInShared: 'Search in shared',
      },
      empty_folder: {
        title: 'This looks empty!',
        subtitle: 'Click the upload button to get started.',
      },
      app_menu: {
        search_box: 'Search',
        filter: {
          date: 'Upload Date',
          size: 'Size',
          name: 'Name',
          type: 'File type',
        },
        upload: {
          title: 'Select type of file',
          document: 'Upload a document',
          media: 'Upload media',
          take_photo: 'Take a photo',
          cancel: 'Cancel',
        },
        settings: {
          storage: 'Storage',
          more: 'More info',
          drive: 'Drive',
          contact: 'Contact',
          signOut: 'Sign out',
          devTools: 'Dev tools',
        },
      },
      file_and_folder_options: {
        styling: 'Style color',
        icons: 'Cover icon',
        type: 'Type: ',
        added: 'Added: ',
        size: 'Size: ',
        move: 'Move',
        share: 'Share with link',
        delete: 'Delete',
        view: 'View',
      },
    },
    modals: {
      move_modal: {
        title: 'Choose a folder to move this file.',
      },
      share_modal: {
        title: 'Internxt Drive file sharing',
        message:
          'Hello, \nHow are things going? I’m using Internxt Drive, a secure, simple and private cloud storage service https://internxt.com/drive \nI wanted to share a file ({0}) with you through this private link ({1} total uses), no sign up required: {2}',
        share: 'Share',
        copy: 'Copy',
        loading: 'Loading link...',
      },
      delete_modal: {
        title: 'Delete permanently?',
        subtitle: 'Please confirm you want to delete this item. This action can not be undone.',
        warning: 'This action cannot be undone',
        delete: 'Delete',
      },
      out_of_space_modal: {
        title: 'Ran out of storage',
        subtitle:
          'You have currently used 3GB of storage. To start uploading more files, please upgrade your storage plan.',
      },
      coming_soon_modal: {
        title: 'Coming soon!',
        subtitle: 'Our fantastic devs are working on it, so stay tuned!',
        got_it: 'Got it!',
      },
    },
  },
  es: {
    generic: {
      loading: 'Cargando',
      cancel: 'Cancelar',
      security: 'Seguridad',
      create: 'Crear',
      creating: 'Creando...',
      rename: 'Renombrar',
      close: 'Cerrar',
      upload: 'Subir',
      delete: 'Eliminar',
      settings: 'Configuración',
    },
    tabs: {
      home: 'Inicio',
      drive: 'Drive',
      create: 'Crear',
      photos: 'Photos',
      menu: 'Menú',
    },
    screens: {
      home: {
        title: 'Inicio',
      },
      change_password: {
        title: 'Cambiar contraseña',
        confirm: 'Borrar cuenta',
        warning:
          'Recuerda que si cambias tu contraseña, se cerrará sesión en todos tus dispositivos. Necesitarás la nueva contraseña para acceder otra vez.',
      },
      recover_password: {
        title: 'Recuperar contraseña',
        warning: 'Usa este dispositivo para cambiar tu contraseña y recuperar tu cuenta.',
      },
      login_screen: {
        title: 'Inicia sesión en Internxt',
        forgot: '¿Has olvidado la contraseña?',
        no_register: 'No tengo cuenta',
        register: 'Crear una',
        back: 'Iniciar sesión',
      },
      register_screen: {
        first:
          '{0} es un servicio de almacenamiento en la nube {1}. Un lugar {2} para todos tus archivos. Bienvenido a la {3}. Bienvenido a {4}.',
        second:
          'Los archivos son {4} en tu dispositivo. {5} de terceros podemos acceder a ellos. {6}, como siempre tuvo que ser.',
        third:
          'Accede a Internxt desde {7}, {8} o {9}. Empieza a usar Internxt hoy con {10} gratis. {11} cuando lo necesites, gratis por un mes, cancela cuando quieras.',
        bold_first: ['Internxt', 'diferente', 'mejor', 'revolución', 'Internxt'],
        bold_second: ['encriptados', 'Ni nosotros ni ningún servicio', 'Privacidad'],
        bold_third: ['escritorio', 'web', 'móvil', '10 GB', 'Mejora tu almacenamiento'],
        security_title: 'Internxt Security',
        security_subtitle:
          'Interxt usa tu contraseña para encriptar y decriptar tus archivos. Debido a la segura naturaleza de nuestro servicio, nosotros no sabemos tu contraseña. Esto significa que si algún día la llegas a perder, tus archivos se volverán inaccesibles. Con nosotros, tú eres el único propietario de tus archivos.',
        suggestion_1: 'Guardes tu contraseña. Mantenla sana y salva.',
        suggestion_2: 'Guarda una copia local de todos tus archivos.',
        create_account_title: 'Crear cuenta',
      },
      forgot_password: {
        title: 'Internxt security',
        subtitle_1:
          'Como se especificó durante el proceso de registro, Internxt Drive encripta tus archivos, y solo tú tienes acceso a ellos. Nosotros nunca llegamos a conocer tu contraseña, y debido a esto, solo tú puedes desencriptar tus archivos. Si te has olvidado de la contraseña, no podemos restablecerla. Lo que sí que podemos hacer, es',
        bold: ' borrar tu cuenta y todos tus archivos',
        subtitle_2:
          ', por lo que podrás volver a registrarte con el mismo correo electrónico. Por favor, introduce tu correo electrónico para que podamos procesar el borrado de tu cuenta.',
      },
      deactivation_screen: {
        title: 'Email de desactivación',
        subtitle_1:
          'Por favor, comprueba el email que te hemos enviado y sigue las intrucciones para desactivar tu cuenta para que puedas seguir usando Internxt Drive.',
        subtitle_2:
          'Una vez desactives tu cuenta, podrás volver a registrarte usando el mismo correo electrónico. Por favor guarda tu contraseña en un lugar seguro. Con Internxt Drive, solo tú eres el propietario de tus archivos. Un gran poder convella una gran responsabilidad.',
      },
      drive: {
        title: 'Drive',
        sort: {
          Name_Asc: 'Nombre',
          Date_Added: 'Fecha de subida',
          Size_Asc: 'Tamaño',
          File_Type_Asc: 'Tipo de archivo',
        },
        emptyRoot: {
          title: 'Tu drive está vacío',
          message: 'Prueba a subir un archivo o crear una carpeta',
        },
        emptyFolder: {
          title: 'Esta carpeta está vacía',
          message: 'Prueba a subir un archivo o crear una carpeta',
        },
        searchInThisFolder: 'Buscar en esta carpeta',
      },
      recents: {
        title: 'Recientes',
        empty: {
          title: 'No hay archivos recientes',
          message: 'Intenta interactuar con tus archivos',
        },
      },
      shared: {
        title: 'Compartido',
        empty: {
          title: 'No hay archivos compartidos',
          message: 'Tus archivos compartidos se mostrarán aquí',
        },
      },
      storage: {
        title: 'Almacenamiento',
        currentPlan: 'Plan actual',
        usage: 'Uso',
        space: {
          title: 'Espacio de almacenamiento',
          used: {
            used: 'Usado',
            of: 'de',
          },
          legend: {
            used: 'Espacio usado',
            unused: 'Espacio sin usar',
          },
        },
        plans: {
          title: 'Planes de almacenamiento',
          title_2: 'Duración del pago',
          current_plan: 'Actualmente estás suscrito al plan de',
          pay: 'Paga',
          pre_pay: 'Prepaga',
          month: 'al mes',
          months: 'meses',
        },
      },
      create_folder: {
        input: 'Nombre de la carpeta',
        title: 'Crear carpeta',
        confirm: 'Crear',
      },
      billing: {
        title: 'Facturación',
      },
      gallery: {
        title: 'Galería',
        nPhotosSelected: '{0} seleccionadas',
        groupBy: {
          years: 'Años',
          months: 'Meses',
          days: 'Días',
          all: 'Todo',
        },
      },
    },
    components: {
      buttons: {
        sign_in: 'Iniciar sesión',
        create: 'Crear cuenta',
        next: 'Siguiente',
        get_started: 'Empezar',
        continue: 'Continuar',
        back: 'Atrás',
        creating_button: 'Creando...',
        deactivation: 'Reenviar correo de desactivación',
        sing_up: 'Registarse',
        descrypting: 'Desencriptando...',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        move: 'Mover',
        share: 'Compartir',
        upgrade: 'Mejorar',
        upgradeNow: 'Comprar espacio',
        uploadFiles: 'Subir archivos',
        uploadFromCameraRoll: 'Subir desde la galería',
        takeAPhotoAnUpload: 'Tomar una foto y subir',
        newFolder: 'Nueva carpeta',
        changePlan: 'Cambiar plan',
        select: 'Seleccionar',
        selectAll: 'Seleccionar todo',
      },
      inputs: {
        email: 'Correo electrónico',
        newPassword: 'Nueva contraseña',
        password: 'Contraseña',
        confirm_password: 'Confirmar contraseña',
        first_name: 'Nombre',
        last_name: 'Primer apellido',
        searchInRecents: 'Buscar en recientes',
        searchInShared: 'Buscar en compartido',
      },
      empty_folder: {
        title: '¡Esto parece vacío!',
        subtitle: 'Aprieta en el botón de subida para empezar.',
      },
      app_menu: {
        search_box: 'Buscar',
        filter: {
          date: 'Fecha de subida',
          size: 'Tamaño',
          name: 'Nombre',
          type: 'Tipo de archivo',
        },
        upload: {
          title: 'Selecciona el tipo de archivo',
          document: 'Sube un documento',
          media: 'Sube multimedia',
          take_photo: 'Haz una foto',
          create_folder: 'Nombre de la carpeta',
          cancel: 'Cancelar',
        },
        settings: {
          storage: 'Almacenamiento',
          more: 'Más información',
          drive: 'Drive',
          contact: 'Contacto',
          signOut: 'Cerrar sesión',
          devTools: 'Herramientas de desarrollador',
        },
      },
      file_and_folder_options: {
        styling: 'Color de la carpeta',
        icons: 'Icono',
        type: 'Tipo: ',
        added: 'Añadido: ',
        size: 'Tamaño: ',
        move: 'Mover',
        share: 'Compartir',
        delete: 'Borrar',
        view: 'Ver',
      },
    },
    modals: {
      move_modal: {
        title: 'Selecciona una carpeta a la que mover el archivo.',
      },
      share_modal: {
        title: 'Compartir archivo de Internxt Drive',
        message:
          'Hola, \n¿Cómo van las cosas? Estoy usando Internxt Drive, un servicio de almacenamiento en la nube seguro, simple y privado https://internxt.com/drive \nQuería compartir un archivo ({0}) contigo a través de este enlace privado ({1} usos totales) , no es necesario registrarse: {2}',
        share: 'Compartir',
        copy: 'Copiar',
        loading: 'Cargando link...',
      },
      delete_modal: {
        title: '¿Borrar completamente?',
        subtitle: 'Por favor, confirma que realmente quieres borrar este objeto. Esta acción no puede deshacerse.',
        warning: 'Esta acción no puede deshacerse',
        delete: 'Borrar',
      },
      out_of_space_modal: {
        title: 'No tienes más espacio',
        subtitle:
          'Actualmente has usado 10GB de almaceniamiento. Para seguir subiendo más archivos, por favor, mejora tu plan de almacenamiento.',
      },
      coming_soon_modal: {
        title: '¡Próximamente!',
        subtitle: 'Nuestros fantásticos programadores están trabajando en ello, así que mantente al tanto!',
        got_it: 'Entendido!',
      },
    },
  },
});

export default strings;
